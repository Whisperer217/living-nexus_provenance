# Living Nexus — Full Platform TODO

## Phase 1: Database & Backend
- [x] Add stripeAccountId + stripeAccountStatus to users table
- [x] Build server/db.ts helpers (songs, comments, tips, profile, licenses, slots)
- [x] Build tRPC routers: songs, profile, comments, tips, licenses, slots
- [x] Build S3 upload endpoint (audio + cover art)
- [x] Build Witness ID generation endpoint (server-side)
- [x] Build PDF certificate generation

## Phase 2: Stripe
- [x] Stripe Connect Express onboarding (creator "Enable Tips" flow)
- [x] Store stripe_account_id + status on user record
- [x] Tip checkout with transfer_data + 10% platform fee
- [x] License purchase checkout ($89.98 → 100 slots)
- [x] Slot purchase checkout ($0.99/slot)
- [x] Stripe webhook handler (account.updated, payment_intent.succeeded, account.application.deauthorized)

## Phase 3: Frontend Pages
- [x] Landing / Discover page (public creators gallery)
- [x] Individual creator profile showroom page
- [x] Song detail page (unique URL, comments, tip jar, share, Witness ID badge)
- [x] Upload page (unified with Witness ID step, S3 upload, full tRPC integration)
- [x] Creator dashboard (song management, slots, license status, payout status)
- [x] Verify Witness ID page

## Phase 4: Design & Polish
- [x] BDDT design system applied throughout (Orbitron gold, cyan, dark panels)
- [x] Auth integration (login/logout, protected routes)
- [x] TypeScript check — zero errors
- [x] Vitest tests for key routers
- [x] Dashboard nav item added to sidebar (desktop + mobile)
- [x] Stripe Connect per Command Domains LLC spec (10% platform fee, transfer_data)

## Phase 5: Suno-Inspired UI Overhaul
- [x] Fix /profile 404 — added ProfilePage route to App.tsx
- [x] Rebuild CreatorProfilePage — banner, avatar, stats, featured songs grid, full song list with context menu
- [x] Rebuild SongDetailPage — lyrics panel (editable by owner), emoji reactions, related songs sidebar, AI Transform stub
- [x] Rebuild LikedPage as Archive — tabbed library (Songs/Playlists/History), search, sort, genre filter, stats bar
- [x] Add lyricsText column to songs table (migration applied)
- [x] Add songs.updateLyrics and songs.getRelated tRPC procedures
- [x] Add updateSongLyrics and getRelatedSongs db helpers
- [x] Rename sidebar "Liked Songs" to "Archive" with Library icon
- [x] TypeScript: 0 errors | Vitest: 1/1 passing

## Phase 6: Audit Fixes
- [x] Fix SPA routing — already correctly implemented (Vite catch-all + server fallback)
- [x] Wire audio player on Explore/Discover page — addAndPlay() from PlayerContext, global player bar activates
- [x] Fix creator page duplicate Featured Songs / Songs sections — Featured=top 8 grid, All Songs=full compact list
- [x] Add login/signup CTA visible to unauthenticated users — sidebar footer shows Sign In button with gold styling
- [x] Add dynamic OG meta tags to /song/:id and /creator/:id pages (og:title, og:image, og:description, twitter:card)
- [x] Listen Together route confirmed working — /together route registered, page fully built with rooms + chat
- [x] CreatorProfilePage handlePlay now uses global addAndPlay() instead of local Audio object
- [x] HelmetProvider added to main.tsx for OG meta tag support
- [x] TypeScript: 0 errors | Vitest: 1/1 passing

## Phase 7: Routing & Player Fixes
- [x] Add /archive route alias (maps to LikedPage/Archive)
- [x] Add /listen-together route alias (maps to TogetherPage)
- [x] Rewrite ExplorePage to load real DB songs via trpc.songs.discover — uses addAndPlay() for global player
- [x] ExplorePage now shows loading skeleton, empty state, play count, WID badge, artist/genre links
- [x] TypeScript: 0 errors | Vitest: 1/1 passing

## Phase 8: AI Transform Feature (Sonauto API)
- [x] Store SONAUTO_API_KEY as project secret
- [x] Add aiTransforms table to drizzle schema (songId, userId, status, prompt, style, outputUrl, sonautoTaskId, errorMessage, timestamps)
- [x] Push DB migration (direct SQL applied, lyricsText already in DB)
- [x] Add createAiTransform / getAiTransformById / updateAiTransformStatus DB helpers to server/db.ts
- [x] Add songs.aiTransform tRPC procedure (calls Sonauto V2 API, stores task in DB, returns transformId)
- [x] Add songs.getTransformStatus tRPC procedure (polls DB + Sonauto API, updates status on completion)
- [x] Replace AI Transform stub modal with full functional modal (prompt, style preset, quick tags, processing spinner, result audio player, download button)
- [x] TypeScript: 0 errors | Vitest: 1/1 passing

## Phase 9: Audio Player Fix
- [ ] Audit PlayerContext addAndPlay, player bar metadata display, DiscoverPage/ExplorePage click handlers
- [ ] Fix addAndPlay so clicking a track card loads it into the bottom player bar and starts playing
- [ ] Player bar must show track title, artist name, and cover art
- [ ] Active track card shows animated waveform instead of play button

## Phase 10: OAuth Login Fix
- [x] Fix redirectUri so ?code= lands on /api/oauth/callback not /?code=
- [x] Verify server exchanges code for session token and sets cookie
- [x] Verify redirect to / after successful auth

## Phase 11: Dashboard My Transforms Tab
- [x] Add getAiTransformsByUser DB helper (joins aiTransforms with songs for original title)
- [x] Add songs.getMyTransforms tRPC procedure (protected, returns user's transforms)
- [x] Add My Transforms tab to DashboardPage with status icons, prompt preview, WID link, play/download buttons

## Deferred (out of credits)
- [x] Build /verify/:witnessId public provenance page
- [ ] Wire Follow button on creator profiles (follows table + mutations)

## Phase 12: Seed Track Artist Name Update
- [x] Update 8 Explore page seed track artist names (Celestial Drift→Nova Kaine, Golden Hour Protocol→VLTG3, Midnight Sermon→Seraph Cole, Sacred Frequencies→Aura Vessel, Throne of Bass→D-Rex, Violet Prophecy→Lyric Haze, Architect of Sound→Marco Spire, Divine Static→Ghost Lumen)

## Phase 13: DB Seed Track Artist Name Update
- [ ] Update artist names on 8 seed songs in the database (title-matched UPDATE queries)

## Phase 14: Deep Navy-Black Theme + Ambient Glow
- [x] Update CSS theme variables: base bg #080d14, card/surface bg #0a0812
- [x] Add ambient glow utility classes for hero, track cards, player bar, WID badge
- [x] Add radial gradient on homepage hero (dark center → deep purple/blue edge)
- [x] Update hardcoded oklch background values in layout, sidebar, player bar, track cards

## Phase 15: Track Status Field
- [x] Add songStatus enum (Draft, Published, Unlisted, Deleted) to drizzle schema
- [x] Add status column to songs table with default 'Published'
- [x] Run db:push / direct SQL to apply migration (existing rows defaulted to Published)
- [x] Update DB helpers to filter by status (getPublicSongs, getSongWithCreator, getRelatedSongs exclude non-Published)
- [x] Add updateSongStatus helper to db.ts
- [x] Add songs.updateStatus tRPC procedure to routers.ts
- [x] Add status dropdown to Dashboard My Songs tab (color-coded: Draft=amber, Published=green, Unlisted=purple, Deleted=red)
- [x] Write Vitest test for songs.updateStatus (4 tests passing)

## Phase 16: Archive Page Shell
- [x] Review existing LikedPage/Archive component and /archive route in App.tsx
- [x] Build new ArchivePage: auth guard (redirect to sign-in if not logged in), list user's own tracks
- [x] Each row: cover art, title, genre, upload date, status tag (color-coded)
- [x] Register /archive route in App.tsx (replaces LikedPage on /archive)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 17: Archive Publish Toggle
- [x] Add publish toggle button to each track row on /archive page (Draft ↔ Published)
- [x] Optimistic update via songs.updateStatus tRPC procedure (onMutate/onError/onSettled pattern)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 18: Separate /liked and /archive Pages
- [x] Audit likes DB schema, tRPC procedures, and existing LikedPage
- [x] Created likes table in DB (userId, songId, createdAt, unique constraint)
- [x] Added getLikedSongs, toggleLike, getLikeStatus helpers to db.ts
- [x] Added songs.getLiked, songs.toggleLike, songs.getLikeStatus tRPC procedures
- [x] Rewrote LikedPage to show tracks liked from other creators (not own uploads)
- [x] /liked → LikedPage and /archive → ArchivePage already separately registered in App.tsx
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 19: Open Graph Meta Tags for /song/:id
- [x] Audit server routing and HTML template (index.html) for OG tag injection point
- [x] Created server/og.ts: bot-UA detection, DB fetch, OG+Twitter meta tag injection into HTML template
- [x] OG tags: og:type, og:site_name, og:title, og:description, og:image (+width/height), og:url, twitter:card, twitter:title, twitter:description, twitter:image
- [x] Registered registerOgRoutes(app) in server/_core/index.ts before Vite/static middleware
- [x] Smoke-tested: Discordbot UA on /song/1 returns correct OG tags with real cover art URL
- [x] Regular browser UA falls through to normal SPA flow (no change)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 20: Custom Domain livingnexus.org
- [x] Audited all files — only 2 had old domain references
- [x] Updated OG canonical URL in server/og.ts from manus.space to https://livingnexus.org
- [x] cdn.manus.space genre icon URLs in DiscoverPage are Manus CDN assets (not app domain, cannot change)
- [x] OAuth redirect URI: already dynamic via window.location.origin — no code change needed
- [x] Stripe webhook URL: must be updated manually in Stripe Dashboard → Webhooks
- [x] CloudFront/S3 CORS: managed by Manus platform infrastructure — no code change needed
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 21: Move Lyrics to Upload Page
- [x] Audited upload page, WID payload, DB schema (lyricsText/lyricsHash columns already exist)
- [x] Added lyricsText to createSong DB helper and songs.upload tRPC input schema
- [x] Added Textarea import and lyrics state to UploadPage
- [x] Added LYRICS textarea to Step 2 (Metadata) of upload page, before AI Consent section
- [x] Included lyrics in WID payload string: |LYRICS:{first 500 chars} appended to cryptographic payload
- [x] Passed lyricsText to upload mutation call
- [x] Updated song detail page: lyrics section is read-only display only, hidden if no lyrics, no editing prompt
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 22: Profile Persistence Fix
- [x] Audited: root cause was ProfilePage using PlayerContext state (in-memory) instead of DB
- [x] Added location column to users table (SQL + drizzle schema)
- [x] Added name and location to updateUserProfile helper and profile.update tRPC input schema
- [x] Rewrote ProfilePage to load from trpc.profile.me and save via trpc.profile.update mutations
- [x] Avatar/banner uploads call trpc.profile.uploadAvatar/uploadBanner and invalidate profile.me cache
- [x] All editable fields (name, artistHandle, bio, location, website, socials) persist to DB permanently
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 23: Wire Heart/Like Button
- [x] Created useLike hook (client/src/hooks/useLike.ts) — DB-backed, optimistic update, auth guard
- [x] Wired useLike to heart button in TrackCard (replaces PlayerContext in-memory Set)
- [x] Wired useLike to Like button in SongDetailPage (pink filled/unfilled, hidden for own songs)
- [x] Unauthenticated users redirected to sign-in on heart click
- [x] /liked page auto-refreshes via utils.songs.getLiked.invalidate() on toggle
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 24: Liked Songs Sidebar Nav Item
- [x] Added Heart/Liked Songs nav link under MY MUSIC section in sidebar, linking to /liked
- [x] Archive nav item now correctly points to /archive (was /liked)
- [x] Updated PAGE_SUMMARIES for /archive and /liked in QuickRefSlider
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 25: Like Count Badge
- [x] Added getLikeCount DB helper to server/db.ts (COUNT(*) query on likes table)
- [x] Added songs.getLikeCount tRPC procedure (public, returns total likes for a songId)
- [x] Updated TrackCard to show like count next to heart icon (shows on hover, formats 1k+ as "1.0k")
- [x] Updated SongDetailPage to show like count next to Like/Liked button
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 26: Mobile Safe Area Inset Fix
- [x] Added viewport-fit=cover to <meta name="viewport"> in client/index.html
- [x] Added paddingBottom: env(safe-area-inset-bottom, 0px) to PlayerBar root element; changed fixed h-[82px] to minHeight: 82px so bar grows with safe area
- [x] Added bottom padding to scrollable content div in MainLayout: calc(82px + env(safe-area-inset-bottom, 0px)); Tailwind pb-[82px] as fallback for desktop
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 27: Fix OAuth Redirect URI to www.livingnexus.org
- [x] Audited getLoginUrl() — root cause: window.location.origin resolves to sandbox preview URL when accessed via manus.space subdomain
- [x] Audited server OAuth handler — no hardcoded domains, uses state param correctly
- [x] Fixed: const.ts now hardcodes PRODUCTION_ORIGIN = https://www.livingnexus.org; redirectUri always uses this regardless of current browser URL
- [x] All 12 call sites of getLoginUrl() automatically benefit (no changes needed in pages)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 28: Fix Featured Creators — Remove Anonymous/Empty Slots
- [x] Found getAllCreators DB helper — was returning ALL users with no filters
- [x] Rewrote getAllCreators: INNER JOIN on songs (status=Published), WHERE name IS NOT NULL AND name != '', GROUP BY user, HAVING count > 0
- [x] Added isNotNull to drizzle-orm imports
- [x] Added frontend safety filter: creators.filter(c => c.name && c.name.trim().length > 0) as a second line of defense
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 29: Jukebox Feature — Listen Together
- [x] Audited TogetherPage — was fully client-side/demo with no DB
- [x] Added jukeboxQueue DB table (roomCode, songId, tipperId, tipperName, tipAmountCents, stripeSessionId, position, playedAt, skippedAt)
- [x] Ran pnpm db:push — migration applied successfully
- [x] Added 4 jukebox DB helpers: getJukeboxQueue, addToJukeboxQueue, markJukeboxItemPlayed, markJukeboxItemSkipped
- [x] Added 4 tRPC procedures: jukebox.getQueue, jukebox.tipToQueue (Stripe checkout), jukebox.confirmQueue, jukebox.markPlayed, jukebox.skipCurrent
- [x] Queue polling every 5s for real-time sync across room members
- [x] Built NowPlayingPanel: cover art, title, creator, WID badge, tipper name + tip amount, hidden audio element
- [x] Built QueuePanel (right side): upcoming songs + tipper + tip amount
- [x] Built SongBrowserModal: search catalog, select song, set tip amount ($1 min), confirm
- [x] Chat feed auto-announces: "[Username] tipped $X to [Creator] — [Track Title] is up next 🎵"
- [x] Host skip button (HOST badge shown, skip only visible to room creator)
- [x] Stripe checkout fires immediately; creator receives funds via transfer_data.destination
- [x] Stripe success redirect: ?jukebox=success&songId=X triggers confirmQueue mutation
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 30: Jukebox Bug Fixes
- [x] Bug 1: Root cause — discover returns nested { song: {...}, creator: {...} }; browser was reading flat s.title/s.coverArtUrl. Fixed by flattening in flatSongs map: s.song.title, s.song.coverArtUrl, s.creator.name
- [x] Bug 2: Root cause — same nested shape; s.id was undefined (real id at s.song.id). Fixed in flatSongs map: id: s.song?.id ?? s.id
- [x] Both fixes applied in SongBrowserModal in TogetherPage.tsx
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 31: Stripe Connect Onboarding for Creators
- [x] stripeAccountId and stripeAccountStatus already existed in schema — no migration needed
- [x] DB helpers (updateUserStripeAccount) already existed
- [x] tRPC procedures (tips.connectOnboarding, tips.connectStatus) already existed
- [x] Stripe webhook account.updated handler already existed
- [x] Dashboard already had Tip Payments card with Connect button
- [x] Added Payments tab to ProfilePage with full status display (Not Connected / Pending / Active)
- [x] Connect Stripe button opens Stripe Express onboarding in new tab
- [x] Active state shows Manage Stripe Account link
- [x] Fee breakdown (90% creator / 10% platform) shown in Payments tab
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 32: Bug Fixes — Featured Creators, Song Detail Timeout
- [x] Featured Creators: DB query is correct (only 3 valid creators exist); '?' avatars are expected fallback for creators without profile photos — not a missing-name issue. Filter is working correctly.
- [x] /song/30001 timeout: root cause found — filename contains unencoded special chars (spaces, commas, !, emoji) in S3 URL causing browser Audio API to fail. DB queries are fast (110ms each).
- [x] Fix 1: Added safeAudioUrl() helper in shared/const.ts that URL-encodes path segments of CDN/S3 URLs
- [x] Fix 2: Applied safeAudioUrl() in SongDetailPage (Audio constructor) and PlayerContext (all audio.src assignments)
- [x] Fix 3: Sanitized audioFileName in upload procedure to prevent future occurrences (replaces non-alphanumeric chars with underscores)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 33: Featured Creators Final Fix
- [x] Verified getAllCreators DB query — filter is correct: INNER JOIN songs WHERE status=Published, WHERE name IS NOT NULL AND name != '', HAVING count > 0
- [x] Verified live API response — exactly 3 valid creators returned: Doc Seraph Mercer, Greg Speed, Mannon The Conquerer
- [x] Root cause of '?' confirmed: letter avatar fallback for creators without profile photos. NOT a data issue.
- [x] Improved creator card UI: colored gradient avatar background per creator (deterministic hue from id), larger initial letter, track count shown, name more prominent
- [x] Frontend filter still in place: creators.filter(c => c.name && c.name.trim().length > 0)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 34: Batch Upload / Album Feature
- [x] Audited existing upload flow — WID generation uses SHA-256 + ECDSA P-256 in-browser, same pattern reused
- [x] Added songs.batchUpload tRPC procedure: albumName, genre, aiConsent, coverBase64, tracks array (min 1, max 50)
- [x] Each track gets its own WID generated client-side before upload (full ECDSA + SHA-256 flow)
- [x] Shared cover art uploaded once to S3, URL applied to all tracks
- [x] Slot check: throws if user.songSlotsUsed + tracks.length > user.songSlotsTotal
- [x] Built BatchUploadPage: drag-and-drop multi-file zone, per-track title editing, WID badge per track, album metadata panel (cover art, album name, genre, AI consent), progress indicators
- [x] Added /batch-upload route to App.tsx
- [x] Added Batch Upload nav item to sidebar under MY MUSIC
- [x] Added PAGE_SUMMARIES entry for /batch-upload
- [x] Updated CreatorProfilePage to group tracks by albumName and show album sections above flat All Songs list
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 35: Mobile Player Bar Overlap Fix
- [x] Confirmed viewport-fit=cover already set in index.html
- [x] Confirmed PlayerBar already has paddingBottom: env(safe-area-inset-bottom, 0px) and minHeight: 82px
- [x] Fixed content area: removed conflicting Tailwind pb-[82px] md:pb-0 classes that fought with inline style; now uses only inline style paddingBottom: calc(82px + env(safe-area-inset-bottom, 0px)) for all breakpoints
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 36: MediaSession API + Mobile Overlap Fix
- [x] Added navigator.mediaSession.metadata (title, artist, artwork) to PlayerContext in useEffect that fires on currentIdx/tracks change
- [x] Added all 6 mediaSession action handlers: play, pause, previoustrack, nexttrack, seekbackward (10s), seekforward (10s)
- [x] Feature-detected with 'mediaSession' in navigator guard for non-supporting browsers
- [x] Moved paddingBottom: calc(82px + env(safe-area-inset-bottom, 0px)) directly onto the overflow-y-auto scroll container (better Safari iOS compatibility vs inner wrapper)
- [x] Removed redundant inner wrapper div
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 37: Android Nav Bar Overlap Fix
- [x] Root cause: env(safe-area-inset-bottom) returns 0px on Android Chrome (only exposed in fullscreen/PWA mode)
- [x] Fixed PlayerBar: paddingBottom changed from env(safe-area-inset-bottom, 0px) to max(env(safe-area-inset-bottom), 24px)
- [x] Fixed content area: paddingBottom changed from calc(82px + env(safe-area-inset-bottom, 0px)) to calc(82px + max(env(safe-area-inset-bottom), 24px))
- [x] max() ensures 24px minimum clearance on Android gesture nav; real safe-area-inset wins on iPhone/PWA
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase 28: Mobile Player Side Panel
- [x] Build MobilePlayerPanel — floating right-edge tab with song art thumbnail + playing wave indicator
- [x] Slide-out right panel with large art, title, artist, progress bar, play/pause/skip/shuffle/repeat, volume
- [x] Swipe-right-to-close gesture + backdrop tap to close + Escape key
- [x] Desktop PlayerBar hidden on mobile (md:hidden), MobilePlayerPanel hidden on desktop (md:hidden)
- [x] Removed bottom padding on mobile scroll area (side panel frees bottom of screen)
- [x] TypeScript: 0 errors | Vitest: 4/4 passing

## Phase: Seed Data Purge + Queue Hardening

- [x] Delete all seed creator accounts (Aura Vessel, Nova Kaine, VLTG3, Ghost Lumen, Marco Spire, Lyric Haze, Seraph Cole, D-Rex) and their songs
- [x] Harden player queue to only pull published songs with a real audio URL

## Phase: Auto-Load Queue from DB

- [x] Add public tRPC procedure to fetch all published songs for queue seeding
- [x] Build QueueLoader component to seed PlayerContext on app mount
- [x] Update Explore/HomePage/CreatorProfilePage to load full queue on song click
- [x] Verify auto-advance, MobilePlayerPanel metadata updates correctly

## Phase: Visual Design Upgrade

- [x] Update global CSS tokens — text brightness, background gradient, card base, gold color, button glow
- [x] Update DiscoverPage, ExplorePage, HomePage — text/card/badge/button
- [x] Update SongDetailPage, CreatorProfilePage, ArchivePage, DashboardPage, UploadPage

## Phase: Like Button DB Persistence
- [x] Add likes table to schema and migrate
- [x] Add DB helpers: toggleLike, isLiked, getUserLikedSongs
- [x] Add tRPC procedures: songs.toggleLike, songs.getLiked, songs.checkLiked
- [x] Update MobilePlayerPanel heart button to use DB toggle + filled/empty state
- [x] Update PlayerBar heart button to use DB toggle + filled/empty state
- [x] Rewrite LikedPage to fetch from DB

## Phase: Track Edit Panel
- [x] Add caption and collectionTag columns to songs table (SQL migration applied)
- [x] Add updateSongMetadata DB helper (caption, genre, collectionTag, coverArtUrl, aiConsent, status)
- [x] Add songs.updateMetadata tRPC procedure (protected, owner-only)
- [x] Add songs.uploadCoverArt tRPC procedure (base64 → S3 → DB)
- [x] Build EditTrackPanel slide-out sheet component with all fields + WID immutability note
- [x] Wire Edit button on ArchivePage rows to open EditTrackPanel

## Phase: Dashboard My Songs Mobile Fix
- [x] Fix My Songs list mobile layout — metadata wraps cleanly, min 12px font, proper spacing

## Phase: Archive + EditTrackPanel Mobile Bug Fixes
- [x] Archive page — click track row to load into player and play
- [x] EditTrackPanel — single column stacking on screens under 480px

## Phase: Mobile Layout Bug Fixes (Round 2)
- [x] EditTrackPanel — fix field overlapping, 16px spacing, clear labels, scrollable to Save button
- [x] Archive page — add padding-bottom so track list is fully scrollable past player bar
- [x] Dashboard My Songs — add padding-bottom so track list is fully scrollable past player bar

## Phase: Founding Creators Page
- [x] Build /contributors page with five founder cards (gradient avatars, gold badges, contribution tags)
- [x] Hero header with Genesis Day badge and founding quote
- [x] Add "Founding Creators" nav item to sidebar (desktop + mobile)
- [x] Add footer with Founding Creators link to DiscoverPage
- [x] Register /contributors route in App.tsx
- [x] View Creator Profile button links to matched creator profile

## Phase: Contributors Page Card Layout Fixes
- [x] Move Founding Creator badge above the name — not overlapping
- [x] Reduce creator name font size so long names fit on one or two clean lines
- [x] Add proper line spacing between name, emoji, Discord handle, and date
- [x] Fix contribution tag pill spacing — consistent gap, no crowding
- [x] Add more top margin to View Creator Profile button

## Phase: Smart Caption Generator (Llama AI)
- [x] Add songs.generateCaption tRPC procedure using invokeLLM (title + genre + lyrics → caption)
- [x] Build SmartCaptionGenerator UI component with loading state, suggestion display, accept/edit/ignore actions
- [x] Integrate SmartCaptionGenerator into UploadPage caption/description field
- [x] Write vitest test for generateCaption procedure

## Phase: PWA Manifest & Service Worker
- [x] Generate 192x192 and 512x512 app icons from Living Nexus logo
- [x] Upload icons to CDN and place in client/public
- [x] Create manifest.json with all required PWA fields
- [x] Create service worker (sw.js) for basic offline caching
- [x] Wire manifest link and service worker registration into index.html
- [x] Add apple-touch-icon and theme-color meta tags

## Phase: Payment Flow Audit & Fixes
- [x] Audit Stripe Connect configuration (90/10 split, destination charges)
- [x] Audit tip flow backend (song page tip procedure)
- [x] Audit jukebox tip flow backend (queue + payment)
- [x] Audit creator Connect onboarding backend
- [x] Audit tip UI on song detail page
- [x] Audit jukebox tip UI
- [x] Audit creator Connect onboarding UI
- [x] Fix: Add checkout.session.completed webhook handler (tip + jukebox_tip)
- [x] Fix: Add amountCents to jukebox success_url so confirmQueue uses real amount
- [x] Fix all broken backend payment/routing issues
- [x] Fix: Add tip=success toast handler to SongDetailPage
- [x] Fix: Read amountCents from URL params in TogetherPage confirmQueue handler
- [x] Fix: Use same-window redirect for Connect onboarding (not new tab) — mobile compatible
- [x] Fix: Use window.location.origin + path as returnUrl (not window.location.href)
- [x] Fix all broken frontend payment/onboarding issues
- [x] Write vitest tests for payment flow (12 tests — fee split, webhook parsing, URL params, returnUrl)

## Phase: Live Tip Ticker Bar
- [x] Add tips.recentTips tRPC procedure (public, last 20 tips with fan name, creator name, amount, song title)
- [x] Build TipTicker component — horizontal CSS marquee, gold text, dark semi-transparent bg, 30s refetch
- [x] Integrate TipTicker into MainLayout below the top nav bar (desktop + mobile)
- [x] Empty state: "Be the first to tip a creator on Living Nexus 🎵"
- [x] Mobile: slightly smaller text but still visible
- [x] Write vitest test for recentTips procedure

## Phase: Tip Ticker Relocation
- [x] Move TipTicker from top of main content to bottom of layout (above player bar)

## Phase: Full Tip Surface Area
- [x] Build reusable TipModal component (amount selector, tip mutation, greyed-out state if tips not enabled)
- [x] Add Tip button to MobilePlayerPanel (Now Playing side panel) below song title/artist, above progress bar
- [x] Add gold dollar-sign tip icon to PlayerBar (mini player bar) next to like button
- [x] Wire both buttons to TipModal with current song creator data from PlayerContext
- [x] Write vitest test for tip surface area logic

## Phase: Production-Grade Service Worker
- [x] Write sw.js: Network First for API/dynamic, Cache First for static, SWR for audio
- [x] Versioned caches — auto-purge old caches on activate
- [x] skipWaiting + clientsClaim for immediate activation
- [x] Background sync for offline tip and upload queuing
- [x] Update detection — postMessage to clients, gold banner in app
- [x] Branded offline.html page ("Your WIDs are safe 🔐")
- [x] Clean SW registration in index.html — unregister all old workers first

## Phase: Player Experience Improvements
- [x] Creator page song click → load into Now Playing side panel immediately (addAndPlay + open panel)
- [x] Scrollable lyrics section in MobilePlayerPanel (scrollable, shows lyricsText from DB)
- [x] Empty lyrics state: "No lyrics registered — upload lyrics to protect your words."
- [x] Draggable floating player tab — vertical drag on right edge, session-persistent position

## Phase: Five Connected Player Fixes
- [ ] Universal play handoff — every song card/play button on platform routes to side panel
- [ ] Single audio instance — stop current before starting new song
- [ ] Background creator page routing on queue advance
- [ ] Restructure MobilePlayerPanel: fixed top section + scrollable bottom section with lyrics
- [ ] Smooth crossfade cover art transition between songs

## Phase: Five Player Fixes
- [x] Universal play handoff — every song card (TrackCard, HomePage, ExplorePage, DiscoverPage, LikedPage, TrackPage) calls addAndPlay + openNowPlayingPanel
- [x] Single audio instance — addAndPlay stops current audio before starting new track
- [x] Background creator page routing — queue advance navigates to next creator's profile behind the panel
- [x] Two-section panel layout — fixed top (art, title, artist, WID badge, tip) + scrollable bottom (progress, controls, volume, lyrics)
- [x] Crossfade cover art — key-based remount with panelArtFadeIn fade+scale animation on track change

## Phase: Full Player Queue Architecture Rebuild
- [x] Add QueueContext enum to PlayerContext (CREATOR_PAGE, EXPLORE, HOME, SEARCH, SONG_DETAIL, PLAYLIST, LIKED)
- [x] Each page sets its own queue context when loading songs into the player
- [x] Auto-advance pulls next track from active context queue
- [x] Shuffle and repeat operate within current context queue only
- [x] Add playlistItems table to DB schema and push migration (direct SQL applied)
- [x] Add playlist tRPC procedures (playlist.check, playlist.add, playlist.remove, playlist.get)
- [x] Add Add to Playlist button on TrackCard, PlayerBar, MobilePlayerPanel, and SongDetailPage
- [x] Build My Playlist page at /playlist with full shuffle/repeat support and queue context
- [x] Add My Playlist to sidebar navigation
- [x] Add Take to Room button in MobilePlayerPanel (Now Playing panel)
- [x] Wire Take to Room to Jukebox SongBrowserModal with room selector
- [x] Add My Playlist tab to Jukebox SongBrowserModal (drag from playlist into room queue)
- [x] TypeScript: 0 errors | Vitest: 40/40 passing

## Phase: Open Graph Meta Tag Fix
- [x] Audit server/og.ts — identified 3 bugs: canonical URL used req.headers.origin (undefined for bots), description format wrong, bot UA list incomplete
- [x] Fix canonical URL: always use https://www.livingnexus.org (never sandbox/preview URLs)
- [x] Fix og:title format: "Song Title — Artist Name | Living Nexus"
- [x] Fix og:description format: "Listen to [Song Title] by [Artist] on Living Nexus — WID Protected"
- [x] Fix og:image: use song.coverArtUrl (CloudFront URL), fall back to platform logo
- [x] Confirm og:image:width=1200, og:image:height=630, og:type=music.song, twitter:card=summary_large_image
- [x] Expand bot UA detection: added Applebot, AppleNewsBot, Signal, Iframely, Embedly, Prerender, meta-externalagent
- [x] Smoke-tested: curl with Discordbot UA on /song/300005 returns all correct OG tags with real CloudFront cover art URL
- [x] Regular browser UA still gets normal SPA (no OG injection)
- [x] TypeScript: 0 errors | Vitest: 40/40 passing

## Phase: Upload JSON Error Fix (Large WAV Files)
- [x] Root cause: WAV files >37MB base64-encoded exceed the 50mb Express body parser limit, server returns 413 HTML error page instead of JSON ("Unexpected token '<'" on client)
- [x] Fix: Increased Express body parser limit from 50mb to 500mb (covers WAV files up to ~375MB raw)
- [x] Fix: Added frontend file size guard on audio input onChange (375MB max, clear toast error message)
- [x] Fix: Added frontend file size guard on drag-and-drop handler (375MB max, same toast)
- [x] TypeScript: 0 errors | Vitest: 40/40 passing

## Phase: AI Caption Generator Flow Fix
- [x] WID must always generate before caption prompt appears — no exceptions
- [x] After WID confirmed, show optional consent prompt: "Your track is now WID Protected 🔐 — Would you like AI to suggest a caption?"
- [x] Consent prompt explains: title and genre only sent to AI, never lyrics or audio
- [x] Two buttons: "Generate Caption" and "Skip — I'll write my own"
- [x] Server-side caption procedure: removed lyrics from input schema (only title + genre accepted)
- [x] Frontend mutation call: removed lyrics from payload
- [x] Add permanent note under caption field: "Your lyrics are WID protected and never used for AI training."
- [x] Caption field stays blank if creator skips — they fill it manually
- [x] TypeScript: 0 errors | Vitest: 40/40 passing

## Phase: Creator Profile OG Nomination Card
- [x] Add getCreatorForOg DB helper (userId → name, artistHandle, bio, profilePhotoUrl, bannerUrl, primaryGenre, location, twitterHandle, instagramHandle, publishedSongCount, widCount)
- [x] Add /creator/:id OG route to server/og.ts (bot UA detection, DB fetch, inject creator meta tags)
- [x] og:type = profile, og:title = "Artist Name | Living Nexus Creator", og:description = bio + stats
- [x] og:image = bannerUrl (preferred) or profilePhotoUrl or fallback platform logo
- [x] twitter:card = summary_large_image, twitter:creator = @twitterHandle if set
- [x] og:url = https://www.livingnexus.org/creator/:id (canonical)
- [x] Smoke-tested: curl with Discordbot UA on /creator/1 returns all correct tags with real CloudFront banner URL
- [x] Regular browser UA on /creator/1 still gets normal SPA (no OG injection)
- [x] TypeScript: 0 errors | Vitest: 40/40 passing

## Phase: Per-Track Download Permission System
- [x] Add downloadPermission enum field to songs table: "none" | "free" | "tipped" (default: "none")
- [x] Add downloadTipThresholdCents field to songs table (default: 179 = $1.79)
- [x] Push DB migration for new fields (direct SQL applied)
- [x] Add getUserTipTotalForSong and updateSongDownloadPermission DB helpers to server/db.ts
- [x] Add download.getPermission, download.request (tip-gated check), download.updatePermission tRPC procedures
- [x] Add download permission section to EditTrackPanel (3 radio options + tip threshold input)
- [x] Archive selector labels: "No Downloads", "Free Download", "Tip to Download ($1.79)"
- [x] UploadPage: downloadPermission defaults to "none" (auto-off), shown in Review step with note
- [x] SongDetailPage: permission-aware download button (hidden/free/tip-gated with price shown)
- [x] Tip-gated download: server checks if user has tipped >= threshold before returning download URL
- [x] TypeScript: 0 errors | Vitest: 40/40 passing

## Phase 42: Now Playing Panel Redesign + Tip Input Fix
- [x] Fix tip threshold input: allow free-form typing, backspace, and custom amounts (not hardcoded)
- [x] Redesign Now Playing side panel: player controls overlay bottom of cover art, freeing space below for lyrics/info

## Phase 43: Player + Lyrics + Archive Improvements
- [x] Vertical volume bar on right side of cover art: tap/drag to rise, collapses when not active
- [x] Improve lyrics readability in Now Playing panel (larger text, better contrast, line spacing)
- [x] Add lyrics editing to Archive Edit Track panel (post-upload lyrics add/update)

## Phase 44: Music Video Support
- [x] DB: add nullable videoUrl, videoKey, videoWitnessId columns to songs table + migrate
- [x] Server: uploadVideo procedure (S3 + WID hash), update getSongDetail/mySongs to include video fields
- [x] Upload Page: optional video upload field (MP4/MOV, max 500MB) with S3 upload + WID
- [x] Now Playing Panel: video player when videoUrl present, video/audio toggle button
- [x] Song Detail Page: full-width video above track info when videoUrl present
- [x] Edit Track Panel: video upload/replace section
- [x] Tests pass (40/40), zero breaking changes verified, TypeScript: 0 errors

## Phase 45: Manifesto + What's New Popup
- [x] Build /manifesto page — sovereign music doctrine, WID philosophy, creator ownership declaration
- [x] Build What's New / Updates popup — changelog modal with mini how-to guide, first-visit trigger, dismissable
- [x] Add Manifesto link to sidebar nav and footer
- [x] Tests pass (40/40), TypeScript: 0 errors, checkpoint saved

## Phase 46: Mobile Fixes
- [x] Fix WhatsNewModal mobile layout — tighten padding, constrain height, prevent text overflow, pin footer

## Phase 47: Manifesto Timeline Correction
- [x] Rewrite origin timeline with accurate history: BDDT July 2025, WID Dec 2025, Living Nexus born from Testimonial Completion doctrine

## Phase 48: Full-Bleed Now Playing Panel
- [x] Rewrite MobilePlayerPanel: full-bleed cover art top half, dark gradient fade, lyrics in panel, WID badge + Tip Creator pinned above controls
- [x] TypeScript check (0 errors), tests pass (40/40), checkpoint saved

## Phase 49: MobilePlayerPanel Spacing Fixes
- [x] Fix WID/badge row overlapping progress bar, tighten controls row, clean up volume/mute layout

## Phase 50: Now Playing Panel — Zone Separation + Cinema Mode
- [x] Rewrite scrollable content: clearly separated zones (track info, progress+controls, tip, actions+share, volume, lyrics)
- [x] Add Share button with Web Share API (navigator.share), clipboard fallback
- [x] Add Cinema Mode toggle — hides all zones except art + lyrics, toggle always visible

## Phase 51: MobilePlayerPanel Three Fixes
- [x] Move Cinema Mode eye icon from art overlay to playback controls row
- [x] Add clear padding/margin between actions row and volume row
- [x] Move Now Playing / context label above the cover art (header area, not overlapping image)

## Phase 52: Now Playing Panel — Rollback + Four Clean Additions
- [x] Check live site at livingnexus.org to confirm v1.4.0 baseline layout
- [x] Roll back MobilePlayerPanel to v1.4.0 baseline (cover art top, title/artist, progress, controls, tip, playlist/room, volume, lyrics)
- [x] Add Share button in action row (Playlist, Room, Share)
- [x] Add Hide Player button to collapse/minimize the panel
- [x] Add WID badge + AI tag as their own row below artist name
- [x] Add Cinema Mode toggle (eye icon) in panel header — not on cover art

## Phase 53: Cinema Mode Toggle Fix
- [x] Pin Cinema Mode toggle as always-visible floating button — visible in both normal and cinema states so user can always exit

## Phase 54: Player UX Fixes
- [x] Move Cinema Mode eye icon to sit directly next to the heart/like button (same row)
- [x] Remove swipe-right-to-close gesture entirely
- [x] Add bottom grab handle (pill bar) — drag down to close, drag up to expand; no accidental triggers while scrolling lyrics

## Phase 55: Pre-Publish Full Audit
- [x] TypeScript: 0 errors (full tsc --noEmit pass)
- [x] Vitest: 40/40 tests passing (6 test files)
- [x] All routes registered in App.tsx verified (14 routes + 2 verify routes)
- [x] No large files in client/public (64KB total — safe for deploy)
- [x] No HTTP 4xx/5xx errors in network log
- [x] Dev server healthy: LSP clean, TypeScript clean, dependencies OK
- [x] Fix nested <a> inside <Link> in WhatsNewModal footer (React DOM error)
- [x] Add DialogDescription (sr-only) to WhatsNewModal (accessibility warning)
- [x] Bump WhatsNewModal version v1.4.0 → v1.5.0 with Cinema Mode, Share, WID row, grab handle entries
- [x] Confirmed: no large media files in project directory (all assets on CDN)
- [x] Confirmed: service worker, manifest.json, offline.html all correct
- [x] Confirmed: OG tag injection working for /song/:id and /creator/:id
- [x] Confirmed: Stripe webhook registered before express.json() (correct order)
- [x] Confirmed: orphaned pages (ComponentShowcase, MusicWitnessIDPage) are intentionally unrouted

## Phase 56: Eye Icon Order Fix
- [x] Swap heart and eye icon order — heart now renders first (left), eye directly to its right
- [x] Confirmed "6 errors" toast is the nested-anchor bug already fixed in checkpoint 8560ca11 (not yet published)

## Phase 57: Fix Batch Upload JSON Body Size Error
- [x] Root cause identified: base64 audio files sent through tRPC JSON body exceed platform ingress limit
- [x] Add /api/upload-file multipart endpoint to server (accepts raw file, returns S3 URL)
- [x] Update BatchUploadPage to upload files via multipart POST, pass S3 URLs to tRPC batchUpload
- [x] Update server batchUpload procedure to accept fileUrl instead of audioBase64
- [x] Update UploadPage to use same multipart upload pattern (same root cause)
- [x] Update server upload procedure to accept fileUrl instead of audioBase64
- [x] Verify TypeScript clean and tests pass

## Phase 58: Admin User Roster + First-Login Welcome Modal
- [x] Add admin.getUsers procedure (owner-only, returns all users with track count, WID count, license status)
- [x] Build /admin/users page with sortable table (display name, join date, track count, WID count, license status)
- [x] Add route guard: only OWNER_OPEN_ID can access /admin/users
- [x] Add hasSeenWelcome boolean column to users table, push migration
- [x] Add onboarding.markWelcomeSeen mutation (sets hasSeenWelcome = true)
- [x] Build WelcomeModal component (intro text + Discord link, shown on first login)
- [x] Wire WelcomeModal into App.tsx — show when authenticated and hasSeenWelcome is false
- [x] Write vitest tests for admin.getUsers and onboarding.markWelcomeSeen (7 test files, 44 tests passing)

## Phase 59: Add Log Out Button
- [x] Add Log Out to sidebar/hamburger nav — bottom of nav, below all items, subtle styling, no icon
- [x] Add Log Out to Profile page — bottom of page, visible only when viewing own profile while logged in
- [x] Behavior: clears session, redirects to home, Sign In reappears in nav
- [x] TypeScript clean, tests pass

## Phase 60: Laminin Doctrine + /verify/:witnessId Courtroom Page
- [x] Save DOCTRINE.md to codebase root (Laminin/Logos Doctrine v0.1)
- [x] Add trpc.verify.getByWid public procedure — already existed as songs.verifyWid
- [x] Build /verify/:witnessId public page — courtroom UI (no login required); added Covenant Declaration + Laminin doctrine footer
- [x] Register /verify/:witnessId route in App.tsx — already registered
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 61: Divine Steel Color System + Desktop Player + Architecture Polish
- [x] Apply Divine Steel color tokens to index.css (deep navy/gold/teal palette)
- [x] Bump body text weight globally (regular→medium, medium→semibold)
- [x] Upgrade desktop player bar: 56px art, clickable title/artist, animated gold progress, volume slider, expand button
- [x] Add clickable links to mobile player: title→/song/:id, artist→/creator/:id, WID badge→/verify/:witnessId
- [x] Sidebar nav: accent-teal hover, accent-gold left border on active item
- [x] Cards: bg-surface background with border-subtle border
- [x] Section headers: text-primary with letter spacing
- [x] Button system: primary=gold, secondary=bg-elevated+border-subtle
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 62: Fix Dual Audio / Player Sync (Covenant Breach)
- [x] Audit SongDetailPage for independent <audio> elements and local play state
- [x] Remove all independent audio from SongDetailPage — wire play button to global PlayerContext.addAndPlay()
- [x] Audit all other pages for independent audio (CreatorProfilePage, ExplorePage, MobilePlayerPanel) — clean
- [x] Ensure PlayerContext is the single source of truth — one audio element, one player
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 63: Add Grammar Police Tag to Slimdoggy
- [x] Found Slimdoggy in ContributorsPage.tsx (hardcoded founder data)
- [x] Added "Grammar Police" to Slimdoggy's tags array in ContributorsPage.tsx

## Phase 64: Navigation & UX Fixes (5 items)
- [x] Fix 1: Log Out confirmed in all 3 locations (mobile nav, desktop sidebar, profile page)
- [x] Fix 2: Quick Reference items → working nav links with navigate+scroll behavior
- [x] Fix 3: One panel at a time — opening mobile nav closes Quick Reference and vice versa
- [x] Fix 4: Mobile nav bottom padding = max(80px, 80px + safe-area-inset-bottom)
- [x] Fix 5: 🔐 Verify WID → /verify added to every page's Quick Reference list
- [x] TypeScript clean (0 errors), tests pass (44/44)

## Phase 65: Quick Tab Upgrade + Desktop Theater Player
- [x] Quick Tab: add Log Out button at bottom of panel (visible when logged in)
- [x] Quick Tab: replace static trigger with glowing gold pulse tab button
- [x] Quick Tab: add Recent Tracks mini-feed (last 6 tracks, tappable to load)
- [x] Theater Player: build TheaterPlayer.tsx (full-screen modal, video/art, lyrics+comments tabs)
- [x] Theater Player: comments table already existed in schema (no migration needed)
- [x] Theater Player: trpc.comments.list and trpc.comments.add procedures already existed
- [x] Theater Player: wire expand button in PlayerBar (Maximize2 icon) to open TheaterPlayer
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 66: Cinematic Bar Expansion + Mobile Comments Tab
- [x] Desktop PlayerBar: add isExpanded state + expand/collapse tab button on top of bar
- [x] Desktop PlayerBar expanded view: 256px art/video panel (left), track info + controls (center), live comment feed + input (right)
- [x] Desktop PlayerBar: gold glow gradient overlay on art, gold border on expanded bar
- [x] Mobile MobilePlayerPanel: add Comments tab alongside existing Lyrics tab in Cinema Mode
- [x] Mobile Comments tab: trpc.comments.list + trpc.comments.add, same UI as TheaterPlayer
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 67: Phase 66 Quick Fixes + Payment Audit
- [x] Audit: read current payment/licensing modal code and Stripe price IDs
- [x] Audit: read Archive gate UI code
- [x] Fix 1: Add refetchInterval: 15_000 to Live Feed comment query in PlayerBar
- [x] Fix 2: Add comment count badge pill to expand tab button in PlayerBar
- [x] Fix 3: Bump What's New modal to v1.6.0 with Cinematic Bar + Mobile Comments entries
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 68: Pricing Covenant Page
- [x] Build PricingCovenantPage.tsx — Aid Bag Statement, covenant breakdown, $88.88 Stripe checkout
- [x] Register /pricing route in App.tsx
- [x] Add "Creator License" nav item with gold $88.88 badge in sidebar (MainLayout)
- [x] TypeScript clean (0 errors), tests pass (44/44), checkpoint

## Phase 69: PFC Miller Dedication in Manifesto
- [x] Add PFC Miller dedication to ManifestoPage — exact text as specified
- [x] Checkpoint

## Phase 70: QuickRef Panel Layout Fix
- [x] Fix recent tracks feed bottom spacing so Log Out button is always visible and not obscured
- [x] Checkpoint

## Phase 72: PlayerBar Sidebar Offset Fix
- [x] Fix PlayerBar left offset to 164px (sidebar width) so it does not cover Log Out button
- [x] Visual editor inline styles were not persisted to file — no cleanup needed
- [x] TypeScript clean (0 errors), checkpoint

## Phase 73: Fix Stripe Connect "Enable Tips" Error
- [x] Update stripe.accounts.create() to use controller-based account creation (new Connect API)
- [x] Ensure connectOnboarding procedure works with live Stripe Connect enabled account

## Phase 74: Fix Tip "No such destination" Error
- [x] Clear stale test stripeAccountId values from users table in DB
- [x] Add live-mode account validation before creating tip checkout (retrieve account, check charges_enabled)
- [x] Return clear error to frontend if creator hasn't reconnected Stripe in live mode

## Phase 75: Prominent Tips + Tip-to-Download Gate
- [x] Move Tip button to top of song detail page (same row as Like/Share, always visible)
- [x] Show tip amounts ($1/$2/$5/$10/$25/Custom) inline on song page without needing a modal first
- [x] Wire Tip-to-Download gate: fan clicks Download on a gated track → Stripe checkout → on success, serve download URL
- [x] Creator sets minimum tip amount for gated downloads in Archive (already has Free/Tip-to-Download/No Downloads toggle)
- [x] Add tip_download webhook handling to record tip and unlock download

## Phase 76: Event Ledger — Phase A (Foundation)
- [x] Add events table to drizzle/schema.ts (id, type, workId, actorId, payload jsonb, createdAt, softDeleted)
- [x] Run pnpm db:push to migrate schema
- [x] Add createEvent, getEventsByWork helpers in server/db.ts
- [x] Wire createTip → write TIP event first, then tips table (finance)
- [x] Wire createComment → write COMMENT event (events is primary)
- [x] Backfill existing tips into events table with legacyId in payload
- [x] Backfill existing comments into events table with legacyId in payload
- [x] Build unified thread on SongDetailPage: one stream, tips gold-elevated, time-ordered
- [x] Validate data integrity, run tests, save checkpoint

## Phase 77: Performance Optimization
- [x] Replace single drizzle(DATABASE_URL) connection with mysql2 connection pool (connectionLimit: 20)
- [x] Add compression middleware (gzip) to Express server
- [x] Add security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- [x] Lazy load all route-level page components in App.tsx (React.lazy + Suspense)
- [x] Add staleTime (30s) and gcTime (5min) to QueryClient to reduce redundant refetches
- [x] Smart retry logic: skip retries on 4xx errors, retry up to 2x on network errors

## Phase 78: Fix Tip-to-Download + Ticker Bugs
- [x] Fix: song file does not download after Stripe tip-to-download checkout completes
- [x] Fix: tip ticker banner ("Be the first to tip") does not update after a tip payment

## Phase 79: What's New v1.7.0
- [x] Add v1.7.0 entry to What's New modal: live payments, Fan Tips, Tip-to-Download, Stripe Connect onboarding CTA
- [x] Bump version badge to v1.7.0 and mark as Latest

## Phase 80: Creator Activity Feed (Phase B)
- [x] Add getEventsForCreator(creatorId) helper to server/db.ts (fetches all events across creator's songs with song title/cover)
- [x] Add events.getForCreator protected tRPC procedure
- [x] Add Activity tab to DashboardPage (tab button + content panel)
- [x] Show TIP events gold-elevated, COMMENT events purple, WITNESS events green
- [x] Show song title, actor name, timestamp, and payload message per event
- [x] Auto-refresh every 30 seconds
- [x] Empty state with icon when no events yet

## Phase 81: Listen Together Polish
- [x] Fix "HOCopy" button overlap on mobile (Host/Copy buttons colliding)
- [x] Room name + live dot on top row, room code + HOST badge on second row
- [x] Copy + Leave buttons on their own flex-shrink-0 group — no longer collide with room name

## Phase 82: Fix Tip-to-Download Perpetual Polling
- [x] Root cause: metadata was in payment_intent_data.metadata (not session.metadata) — webhook reads session.metadata, so userId was always empty
- [x] Fix: moved metadata to session-level in both createTipDownloadCheckout and createTipCheckout
- [x] Fix: polling now uses mutateAsync with a busy guard to prevent overlapping calls
- [x] Same fix applied to regular tip checkout (createTipCheckout) for consistency

## Phase 83: Jukebox Browser Redesign + Song Slot Price Update
- [x] Change Song Slot price from $0.99 to $0.88 in routers.ts
- [x] Update PricingCovenantPage to reflect $0.88 per slot
- [x] Rebuild SongBrowserModal as Jukebox Browser with left/right card flip navigation
- [x] Add 30s audio preview — plays automatically as you flip through cards, stops after 30s
- [x] Add mute/unmute toggle for preview audio
- [x] Add multi-select queue — tap card or "+ Add to Queue" to select multiple songs
- [x] Add dot scrubber for quick position navigation
- [x] Add checkout step with tip amount quick-select ($1/$2/$5/$10) and custom input
- [x] Sanctuary tab shows all live public songs from every creator on the platform
- [x] My List tab shows user's personal playlist songs in jukebox flipper
- [x] Keyboard nav: left/right arrow keys flip through cards

## Phase 84: Cover Art Image Sizing Fix
- [x] Fix jukebox card — replace aspect-square with fixed 220px height so portrait images don't overflow
- [x] Fix TrackCard artwork — replace aspect-square with fixed 180px height
- [x] Fix DiscoverPage song grid — replace aspect-square with fixed 180px height
- [x] Fix ExplorePage song grid — replace aspect-square with fixed 180px height (skeleton + live cards)
- [x] Fix CreatorProfilePage FeaturedCard — replace aspectRatio 1/1 with fixed 180px height
- [x] Fix MobilePlayerPanel cover art — replace aspect-square with fixed 280px height
- [x] All containers use object-cover so any image (portrait/landscape/square) fills cleanly without distortion

## Phase 85: Cover Art Centering + Arrow Overflow Fix
- [x] Change object-cover to object-cover object-top on all cover art images so faces/subjects are always visible
- [x] Add z-10 relative to jukebox nav arrows so they always sit above the card
- [x] Add min-w-0 to card wrapper to prevent flex overflow into arrow space
- [x] Applied object-top across 12 files: TogetherPage, TrackCard, DiscoverPage, ExplorePage, CreatorProfilePage, SongDetailPage, ArchivePage, PlaylistPage, DashboardPage, LikedPage, HomePage, MobilePlayerPanel

## Phase 86: Sovereign Identity Command Center
- [ ] Rebuild sidebar nav groups: DISCOVER / MY COMMAND / SYSTEM / ACCOUNT
- [ ] Add identity header to sidebar: avatar + name + WID status badge + verified indicator
- [ ] Rename "Archive" → "LNA (Living Nexus Archive)" in nav
- [ ] Add "Witness Records" nav item under MY COMMAND
- [ ] Add "Field Notes" nav item + route under MY COMMAND
- [ ] Rebuild mobile menu with identity header at top (avatar + name + WID)
- [ ] Add Field Notes schema (fieldNotes table), db helper, and tRPC procedures
- [ ] Build FieldNotesPage with create/edit/view entries (blog/doctrine posts)
- [ ] Upgrade profile page: add activity feed, snapshot stats (total works, verified records, last activity)
- [ ] Add featured works pin (1-3 items) to profile page

## Phase 86: Sovereign Identity Command Center
- [x] Rebuilt sidebar as identity-first command center with grouped sections (DISCOVER / MY COMMAND / SYSTEM / ACCOUNT)
- [x] Identity header with avatar, WID/license status badge at top of sidebar
- [x] Added Activity tab to ProfilePage with provenance event feed (TIP, LIKE, WID events, etc.)
- [x] Added snapshot stats (Total Works, Published, Witnessed, License Status) to profile
- [x] Added Field Notes section (doctrine/blog posts) with schema migration (field_notes table)
- [x] Added /field-notes route and sidebar link under MY COMMAND
- [x] Field Notes supports 4 categories: Doctrine, Journal, Update, Concept
- [x] Public/Private toggle per note — public notes visible to all
- [x] Optional video embed (YouTube) and cover image per note
- [x] Category filter bar on Field Notes page

## Phase 87: WID Spec Public Download
- [x] Created /doctrine/wid-spec page with public download for WID Public Specification v1.0 PDF
- [x] Added WID Specification nav item to SYSTEM group in MainLayout sidebar
- [x] Wired CDN PDF download button — https://d2xsxph8kpxj0f.cloudfront.net/...WID_Public_Specification_v1.0.pdf

## Phase 88: Witness Network
- [ ] Add `witnesses` table to schema (witnesserId, witnessedId, createdAt)
- [ ] Add `references` table to schema (fromUserId, toUserId, toSongId, context, createdAt)
- [ ] Run db:push migration
- [ ] Add db helpers: witnessCreator, unwatchCreator, isWitnessing, getWitnessCount, getWitnessedByCount, createReference, getReferencesForSong, getReferencesForUser
- [ ] Add tRPC procedures: witness.toggle, witness.status, witness.network, reference.create, reference.list
- [ ] Add Witness button to CreatorProfilePage (replaces generic follow)
- [ ] Add Reference/Cite panel to SongDetailPage
- [ ] Add Witness Network tab to ProfilePage showing who you witness + who witnesses you
- [ ] Meaningful notifications: "You were referenced in a witness record", "Your work was cited in a derivation"

## Phase 90: Living Nexus Lexicon
- [ ] Define full term mapping (standard → Living Nexus language)
- [ ] Build /lexicon page with term cards in divine noir style
- [ ] Add Lexicon link to sidebar SYSTEM section and footer

## Phase 92: Background Video + Changelog v2.0
- [x] PlayerBar expanded: cover art static until play, muted video fades in on play, fades out on pause
- [x] MobilePlayerPanel: remove manual toggle, auto-show cover art, auto-fade to muted video when playing
- [x] TheaterPlayer: cover art static until play, muted video fades in on play
- [x] All players: video always forced muted (separate from audio stream)
- [x] Update WhatsNewModal to v2.0 with background video, Witness Network, Field Notes, Lexicon, WID Spec entries

## Phase 93: Video Buffering Fallback + Video WID Badge
- [x] PlayerBar expanded: hold cover art while video is buffering (waiting/canplay events), video WID badge pill
- [x] TheaterPlayer: hold cover art while video is buffering, video WID badge pill
- [x] MobilePlayerPanel: hold cover art while video is buffering, video WID badge pill

## Phase 94: Community Notifications (SSE)
- [x] SSE broadcast module (server/sse.ts) — manages client registry, heartbeat, broadcastEvent()
- [x] Register /api/sse/events endpoint in server index
- [x] Detect new vs returning user in OAuth callback, fire new_member SSE event on first login
- [x] useCommunityEvents hook — SSE listener with exponential backoff reconnect
- [x] CommunityToastProvider — Discord-style toast, stacks up to 3, auto-dismiss 6s, slide-in animation
- [x] Mount CommunityToastProvider in App.tsx
- [x] WhatsNewModal updated to v2.1.0 with community notifications, video buffering, Video WID badge entries

## Phase 95: Discord Bug Reports (March 27, 2026)
- [x] Fix song titles missing on mobile profile view (genre moved to second line)
- [x] Fix WID certificate bleeding into comment box when copying from lyric sheet
- [x] Add avatar position/crop adjustment tool (Left/Right + Up/Down sliders)
- [x] Apply avatarObjectPosition to CreatorProfilePage so visitors see correct crop
- [x] Add avatarObjectPosition column to DB schema and push migration

## Phase 96: Collaborative Playlists + Notification Feed (v2.2.0)
- [x] Add playlistCollaborators and notifications tables to drizzle schema
- [x] Push new tables to database via pnpm db:push
- [x] Add playlist and notification DB helpers to server/db.ts
- [x] Add playlist tRPC router (create, list, addSong, invite, acceptInvite, getById)
- [x] Add notifications tRPC router (list, markRead, markAllRead, archive, unreadCount)
- [x] Build PlaylistsPage with create, invite, manage, and play functionality
- [x] Build NotificationsPage (Signals inbox) with unread/all tabs and archive
- [x] Wire notifications into witness toggle (notify creator when witnessed)
- [x] Wire notifications into comment add (notify song owner on new comment)
- [x] Add Playlists and Signals nav items to MainLayout sidebar
- [x] Update WhatsNewModal to v2.2.0

## Phase 97: Witness Registry (Public WID Ledger)
- [x] Fix getWitnessRegistry export error in server/db.ts
- [x] Add witnessRegistry.list tRPC procedure (public, paginated, filtered by type)
- [x] Build WitnessRegistryPage with All / Full Works / Lyrics tabs
- [x] Remove duplicate Witness Records nav link, update to point to new /witness-registry route
- [x] Update changelog to v2.3.0

## Phase 98: Tip Button Consistency
- [x] Audit all tip button locations across the platform
- [x] Grey out / disable tip buttons for creators who have not enabled tips (stripeAccountStatus !== 'enabled')
- [x] TrackPage tip jar: greyed out with "hasn't enabled tips yet" message when tips not enabled
- [x] TogetherPage Jukebox: "Tip & Queue This Song" greyed out when currentCard.stripeAccountStatus !== 'enabled'
- [x] TogetherPage Jukebox: multi-select Queue button blocked with message when any selected song's creator hasn't enabled tips
- [x] All TS errors cleared (0 errors across entire codebase)

## Phase 99: Gift Economy — Offerings Replace Tips
- [x] Rename all "Tip" / "tip" language to "Gift" on song pages, creator profiles, PlayerBar, TrackPage, SongDetailPage, TipTicker
- [x] Rename all "Tip" / "tip" language to "Offering" on TogetherPage jukebox room
- [x] Remove all jukebox tip gating (every song is freely queueable regardless of creator Stripe status)
- [x] Add jukeboxOfferings table to drizzle schema (id, roomCode, tipperId, amountCents, createdAt)
- [x] Add jukeboxPlayEvents table to drizzle schema (id, roomCode, songId, creatorId, playedAt)
- [x] Run db:push migration for new tables
- [x] Add DB helpers: createJukeboxOffering, getOfferingsForRoom, recordPlayEvent, getPlayEventsForRoom, getJukeboxEarningsForCreator
- [x] Add tRPC procedures: jukebox.leaveOffering (Stripe checkout, single charge), jukebox.getMyEarnings (creator dashboard)
- [x] Add "Leave an Offering" jar UI to TogetherPage room (voluntary, non-blocking, amount selector $1/$3/$5/$10/$20)
- [x] Add "Jukebox Earnings" tab to creator Dashboard showing proportional earnings from room offerings
- [x] Queue panel shows "queued by [name]" with optional gift badge if gifted
- [x] DashboardPage: Tips Received → Gifts Received, Tip Payments → Gift Payments, activity feed Tip → Gift
- [ ] Record play events in TogetherPage when a song starts playing in a room (Phase 100)
- [x] Update WhatsNewModal to v2.4.0 with gift economy changes (Phase 100)

## Phase 100: Jukebox Room Share Links
- [x] Audit current /together route and room join flow in App.tsx and TogetherPage
- [x] Add /together/:roomCode route so direct links auto-join the room
- [x] Update TogetherPage to read roomCode from URL param and skip the code-entry screen
- [x] Add Share button to room panel that copies the direct link to clipboard
- [x] Show a toast "Link copied — share it with anyone" on copy
- [x] createRoom auto-copies share link to clipboard on creation
- [x] joinRoom + leaveRoom update URL to reflect current room code
- [ ] Add OG meta tags for /together/:roomCode (Phase 101)
- [x] Update WhatsNewModal to v2.4.0 with share link + gift economy changes (Phase 101)

## Phase 100b: Offering Placement Fix
- [x] Move "Leave an Offering" to the top of the queue panel with a gold border (1.5px solid #D4AF37 border, gold glow)

## Phase 101: Jukebox Browser Bug Fix
- [x] Root cause identified: live site running old build without freeQueue procedure — fix is to Publish latest checkpoint from Management UI

## Phase 102: Jukebox Queue Persistence & Auto-Advance
- [x] Fix queue not persisting — room code saved to sessionStorage, restored on reload/revisit
- [x] Fix auto-advance — NowPlayingPanel now uses onEnded + duration-based fallback timer
- [x] NowPlayingPanel: loadedmetadata event sets fallback timer (duration + 2s buffer)
- [x] Chat message now says "queued" not "tipped $X" for free queue items
- [x] NowPlayingPanel: shows "gifted $X" only when tipAmountCents > 0
- [x] freeQueue procedure confirmed working (live API returns songs, esbuild builds cleanly)
- [x] Root cause of live "No tracks found": old deployed build lacks freeQueue procedure — fix is to Publish latest checkpoint

## Phase 103: Global Player UX Fix + Session Integration
- [ ] Fix expanded player "hide all" dead end — add toggle to switch back to full player view
- [ ] Improve lyrics/comments panel layout — more breathing room, clearer tab switching
- [x] Wire jukebox session into global player — NowPlayingPanel delegates to addAndPlay(), global audio onEnded advances queue
- [x] Add session badge to PlayerBar — gold pill with room code + Leave button when state.room is set
- [ ] Add quick comment shortcut in PlayerBar when session-linked

## Phase 104: Large File Upload Fix (413 on Production)
- [x] Replace multer memory-buffer approach with streaming relay to Forge API
- [x] Browser uploads multipart to /api/upload-file; server streams directly to forge.manus.ai without buffering (busboy + form-data)
- [x] Removed multer dependency from upload route (no more memory buffering)
- [x] TypeScript: 0 errors, 50MB local test returns 401 (auth) not 413 (proxy)

## Phase 105: WhatsNew v2.4.0 + Scroll-to-Top Button
- [x] Update WhatsNewModal to v2.4.0 with gift economy, share links, global player, upload fix entries
- [x] Added v2.3.0 Witness Registry entry between v2.2.0 and v2.1.0
- [x] Add scroll-to-top button (top-right, visible on both mobile and desktop)
- [x] Scroll-to-top button appears after scrolling down 300px, smooth scroll on click
- [x] Gold gradient button with blur backdrop, positioned top-right clear of mobile header

## Phase 106: Video Upload Persistence + Desktop Video Playback
- [x] Fix video upload in UploadPage — replaced base64 tRPC path with streaming relay (/api/upload-file)
- [x] Added uploadVideoByUrl tRPC procedure (accepts URL+key from relay, no base64 encoding, no proxy limit)
- [x] Fixed desktop video in expanded PlayerBar — show video when loaded (not just when playing)
- [x] Fixed desktop video in TheaterPlayer — show video when loaded (not just when playing)
- [x] TypeScript: 0 errors

## Phase 107: Admin Panel + Promo Codes + License Grant
- [x] Promote owner account to admin role in DB (Doc Seraph Mercer, ID 1 — already admin)
- [x] Add promoCodes table to drizzle schema (code, description, slotsGranted, maxUses, usedCount, expiresAt, createdBy, isActive)
- [x] Add promoRedemptions table (userId, promoCodeId, redeemedAt)
- [x] Push DB migration (both tables live)
- [x] Add admin DB helpers: getAdminUsers, adminGrantLicense, createPromoCode, listPromoCodes, deactivatePromoCode, reactivatePromoCode
- [x] Add admin tRPC procedures (adminProcedure guard): admin.getUsers, admin.grantLicense, admin.createPromoCode, admin.listCodes, admin.deactivateCode, admin.reactivateCode
- [x] Add user tRPC procedure: promo.redeem (protected, validates + applies code, grants license + slots)
- [x] Build /admin page: Users tab (search, sort, grant license) + Promo Codes tab (create, copy, deactivate/reactivate)
- [x] Build /redeem page: code entry form, confirmation, success state, already-licensed state
- [x] Add Redeem Code to sidebar nav (all authenticated users, SYSTEM group)
- [x] Add Admin Panel to sidebar nav (role=admin only, both desktop + mobile)
- [x] TypeScript: 0 errors

## Phase 108: Mobile File Picker Fix (iOS Chrome MP3 grayed out)
- [x] Fix audio file input accept attribute — expanded to include all explicit MIME types + extensions for iOS Chrome
- [x] Accept audio/*, audio/mpeg, audio/mp3, audio/wav, audio/x-wav, audio/flac, audio/aac, audio/ogg, audio/x-m4a, audio/mp4 + .mp3/.wav/.flac/.aac/.ogg/.m4a/.aiff
- [x] Fix video file input accept attribute — added video/*, video/x-m4v, .m4v
- [x] Added "On iPhone, use Safari for best file access" hint below the drop zone

## Phase 109: WID Metadata in Downloads (ID3 Tags)
- [x] Installed node-id3 package (built-in TypeScript types)
- [x] Created server/downloadRoute.ts — fetches audio from S3, embeds full ID3 tag set
- [x] Embeds: title, artist, album, year, comment (WID), LNWID, LN_CREATOR, LN_TIMESTAMP, LN_VERIFY_URL, LN_PLATFORM, LN_DOCTRINE
- [x] Embeds cover art as ID3 APIC image tag (fetched from S3)
- [x] Filename: "Title - Artist [WID-MUS-XXXXXXXX].mp3"
- [x] Updated SongDetailPage, CreatorProfilePage, and poll-after-payment flow to use /api/download/:songId

## Phase 110: Public REST API Foundation (Plex/Jellyfin)
- [x] Created server/publicApiRoute.ts with rate limiting (100 req/min per IP)
- [x] GET /api/v1/health — platform health check
- [x] GET /api/v1/catalog — paginated public track listing with stream URLs
- [x] GET /api/v1/track/:id — single track detail
- [x] GET /api/v1/stream/:id — redirect to S3 audio URL for direct streaming
- [x] GET /api/v1/verify/:witnessId — WID verification endpoint
- [x] GET /api/v1/creator/:id — creator profile with track list
- [x] GET /api/v1/plex/manifest — static XML manifest for Plex channel plugin
- [x] GET /api/v1/jellyfin/catalog — Jellyfin-compatible metadata format
- [x] Wired into server/_core/index.ts
- [x] TypeScript: 0 errors

## Phase 111: Upload Progress Bar + BDDT-FREE Code + Plex Field Note
- [x] Add upload progress bar to UploadPage (XHR onprogress, gold gradient bar, "Processing WID..." state, Back button disabled during upload)
- [x] Create BDDT-FREE promo code in DB (100 slots, unlimited uses, 30-day expiry, createdByUserId=1)
- [x] Create Plex/Jellyfin Field Note post on platform (public, category=update, authored by Doc Seraph Mercer)
- [x] TypeScript: 0 errors

## Phase 112: Name Change Audit Trail + Stripe Connect Onboarding
- [x] Add nameHistory table to schema (userId, oldName, newName, changedAt)
- [x] Push DB migration (drizzle/0012_reflective_synch.sql applied)
- [x] Log name change in profile.update procedure whenever name field changes
- [x] verifyWid query returns nameAtWitnessing + full nameHistory array
- [x] VerifyPage shows "Registered as: [original name]" badge when name has changed
- [x] VerifyPage shows Creator Name History timeline when history records exist
- [x] Admin panel: new Stripe Recovery tab with regenerateStripeOnboarding procedure
- [x] Admin can enter User ID to generate fresh Stripe Connect onboarding link for pending accounts
- [x] Link displayed with copy + open buttons; expires after one use or ~24h
- [x] TypeScript: 0 errors | Vitest: 44/44 passing

## Phase 113: Post-112 Execution — Backfill + Stripe Recovery + WhatsNew v2.5.0
- [x] Backfill nameHistory — 81 founding records inserted (all users with a name, dated to account createdAt)
- [x] Mannon (ID 180001) confirmed: acct_1TFO1ILdJ5vqIaYq, status=pending — live key required to generate link (see note)
- [x] Update WhatsNew modal to v2.5.0 with Name Audit Trail + Stripe Recovery entries
- [x] TypeScript: 0 errors | HMR confirmed

## Phase 114: Dashboard Stripe Banner + WID PDF nameAtWitnessing
- [x] Fix 1: Gold banner added to DashboardPage above Stats Cards — visible when connectData.status === 'pending'
- [x] Fix 1: Banner uses existing connectMutation (Continue Setup flow), black button on gold background
- [x] Fix 2: downloadCertificate() added to VerifyPage — generates HTML certificate from live DB data
- [x] Fix 2: 'REGISTERED NAME AT TIME OF WITNESSING' field included when nameAtWitnessing differs from current name
- [x] Fix 2: 'Download Certificate' button added below View Track / Verify Another in Actions row
- [x] TypeScript: 0 errors

## Phase 115: Play Store TWA Wrapper
- [x] Verify PWA manifest at livingnexus.org (icons, start_url, display, theme_color)
- [x] Install Bubblewrap CLI + JDK 17
- [x] Generate keystore (livingnexus.keystore, alias: livingnexus, RSA 2048, 10000 days)
- [x] SHA-256: EA:26:C3:57:D8:2A:71:B4:00:30:3C:3E:95:FD:EB:4C:A2:E4:36:BD:11:25:50:2E:36:8A:26:03:69:A9:68:63
- [x] Add assetlinks.json to client/public/.well-known/ for TWA verification
- [x] Initialize TWA project from manifest (package: org.livingnexus.app)
- [x] Fix minSdkVersion 19→21, fix manifest XML, add splash + ic_maskable drawables
- [x] BUILD SUCCESSFUL — LivingNexus-v1.0.0-release.apk (2.0MB, signed SHA256withRSA)
- [x] Generate 512x512 icon PNG (gold LN shield on black)
- [x] Generate 1024x500 feature graphic PNG (LIVING NEXUS / Witness. Protect. Prove.)
- [x] Package all deliverables — livingnexus-play-store-package.zip (13MB)

## Phase 116: Track Metadata Persistence + Share URL Fix
- [x] Fix 1: Audited full chain — EditTrackPanel, songs.updateMetadata procedure, updateSongMetadata helper all correct
- [x] Fix 1: DB confirmed: caption, genre, collectionTag, aiConsent columns present and writable
- [x] Fix 1: handleSave passes all four fields correctly; no code change needed (was already correct)
- [x] Fix 2: SongDetailPage share modal — uses window.location.href (correct on /song/:id)
- [x] Fix 2: MobilePlayerPanel — uses ${origin}/song/${currentSongId} (correct)
- [x] Fix 2: CreatorProfilePage track share — uses ${origin}/song/${song.id} (correct)
- [x] Fix 2: Desktop PlayerBar had NO share button — added Share2 with Web Share API + clipboard fallback
- [x] Fix 2: PlayerBar share payload: title, text (title by artist — sovereign music with cryptographic provenance), url
- [x] OG tags confirmed: /song/30001 returns og:title, og:description, og:image (cover art), og:url (canonical)
- [x] TypeScript: 0 errors | HMR confirmed

## Phase 117: Stripe Onboarding UX — Four Fixes
- [x] Fix 1: Pre-fill business_type: 'individual' in Connect account creation
- [x] Fix 1: Pre-fill business_profile.url with creator's website or /creator/:id fallback
- [x] Fix 1: Pre-fill business_profile.mcc: '7929' (Bands, Orchestras, Entertainers)
- [x] Fix 2: Pre-onboarding checklist Dialog modal — 6 items: ID, bank account, SSN, address, phone, email
- [x] Fix 2: 'Enable Gifts' button opens checklist first; 'I'm Ready — Start Setup' proceeds to Stripe
- [x] Fix 3: connectStatus returns requirementsDue + requirementsLabels (plain English, deduped)
- [x] Fix 3: 15 Stripe requirement keys mapped to human-readable labels; DOB sub-fields normalized
- [x] Fix 4: Banner expands to two rows when pending: gold CTA row + dark requirements row with amber chips
- [x] Fix 4: Gifts card shows inline 'Still needed:' list (up to 3 items + overflow count)
- [x] TypeScript: 0 errors | Server running on port 3000

## Phase 118: Admin Roster Fix + Ticker Copy + Full Audit
- [x] Fix 1: Root cause — admin.getUsers guarded by ownerOpenId (stricter than role===admin everywhere else)
- [x] Fix 1: Changed to role === 'admin' — 13,237 users + 136 tracks now load in Admin Roster
- [x] Fix 2: Ticker fallback updated to "Support creators directly on Living Nexus 🎵"
- [x] Audit: Security — 0 critical | 2 medium (jukebox charges_enabled, 500MB body limit) | 1 low
- [x] Audit: Payments — 0 critical | 1 medium (jukebox tip missing charges_enabled check) | 0 low
- [x] Audit: Data integrity — 0 critical | 0 medium | 1 low (hard delete path for admin)
- [x] Audit: Performance — 0 critical | 2 medium (no pagination on admin/explore) | 1 low (missing indexes)
- [x] Audit: UX — 0 critical | 0 medium | 1 low (ComponentShowcase not routed)
- [x] Audit: Content — 0 critical | 0 medium | 1 low (console.log in Home.tsx)
- [x] Report produced: living-nexus-audit-report.md — 0 critical, 5 medium, 5 low, all critical systems confirmed solid
- [x] TypeScript: 0 errors | Vitest: 44/44 passing

## Phase 119: Four Targeted Fixes (Audit Follow-up)
- [x] Fix 1: charges_enabled check added to jukebox tipToQueue — throws BAD_REQUEST if Stripe account not verified
- [x] Fix 2: audioBase64 capped at z.string().max(50_000_000) in both upload input schemas
- [x] Fix 2: Express body limit reduced from 500mb to 50mb in server/_core/index.ts
- [x] Fix 3: getAllUsersWithStats now accepts limit/offset, returns { users, total }
- [x] Fix 3: admin.getUsers accepts { limit, offset } input; Admin Roster shows page X of Y + Prev/Next buttons
- [x] Fix 4: console.log in Home.tsx was already removed; only remaining is ComponentShowcase (dev-only demo component)
- [x] TypeScript: 0 errors | Server running on port 3000

## Collection WID Layer (Batch Registration)
- [x] Add `collections` table to drizzle schema (id, creatorId, name, collectionWid, collectiveHash, pdfUrl, pdfKey, trackCount, coverArtUrl, createdAt)
- [x] Add `collectionId` column to `songs` table
- [x] Run db:push migration (both columns live in DB)
- [x] Add collection DB helpers to server/db.ts (createCollection, getCollectionByWid, getSongsByCollectionId, getCollectionForSong, linkSongsToCollection, updateCollectionPdf)
- [x] Extend batchUpload tRPC procedure to generate WID-ALB after all tracks confirmed (SHA-256 of sorted WIDs, format WID-ALB-XXXXXXXX-XXXXXXXX)
- [x] Add verifyCollection tRPC procedure (publicProcedure, returns collection + tracks + creator)
- [x] Add getCollectionForSong tRPC procedure (publicProcedure, returns collection WID/name for a given songId)
- [x] Add generateCollectionCertificate tRPC procedure (protectedProcedure, generates styled HTML cert, uploads to S3, returns pdfUrl)
- [x] Extend /verify/:witnessId page to detect WID-ALB- prefix and render CollectionVerifyView (track list, collective hash, certificate download, covenant declaration)
- [x] Add collection back-reference to TrackVerifyView (shows "Part of Collection" with WID-ALB link if track belongs to a collection)
- [x] Update BatchUploadPage success state to show Collection Certificate block (Collection WID, collective hash, Download Certificate button, Verify Collection link)
- [x] Auto-generate collection certificate HTML → S3 after batch upload completes
- [x] Vitest: 7/7 collection tests passing (WID format, determinism, NOT_FOUND, getCollectionForSong null path)
- [x] TypeScript: 0 errors

## Phase — Three Follow-Up Items (Collection WID v2.6.0)
- [x] Regenerate Certificate button on Dashboard Collections tab (↻ Regen Cert, calls generateCollectionCertificate, opens new cert in tab)
- [x] Registered Collections section on public creator profile page (below Albums, lists collections with WID-ALB links)
- [x] What's New v2.6.0 entry for Collection Certificates (CURRENT_VERSION bumped to v2.6.0, new storage key, 2 items: Collection Certificates + Regenerate Certificate)
- [x] Dashboard Collections tab added (My Collections view with track count, WID, Verify + Download + Regen buttons)
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Phase — v2.7.0 Collection Enhancements

- [x] Batch upload: COLLECTION NAME field (renamed from ALBUM NAME, new placeholder text, helper copy added)
- [x] Batch upload: Cover Art already wired end-to-end (coverArtUrl → batchUpload → createCollection → DB)
- [x] Collection verify page: cover art displayed (28x28 rounded-xl with gold border + glow when present, icon fallback)
- [x] server/og.ts: /verify/:witnessId route added — WID-ALB- prefix → collection OG card (title, description, cover art, canonical URL)
- [x] WhatsNewModal: bumped to v2.7.0 (Collection Name field, Cover Art on verify page, Collection Share Cards)
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Bug Fix — Now Playing Bars Not Syncing on Creator Profile
- [x] Root cause: playingId used playerState.tracks[0].id (always first track in queue) instead of currentTrackId (tracks[currentIdx])
- [x] Fix: replaced tracks[0] with currentTrackId from usePlayer() context — now correctly reflects the actively playing track
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Bug Fix — Jukebox Preview Dual Audio Source
- [x] Root cause: SongBrowserModal had its own audioRef + hidden <audio> element — a separate audio source running in parallel with the global player
- [x] Fix: removed standalone audioRef and <audio> element; imported global audioRef from usePlayer(); preview now pauses the global player, snapshots src+position, plays 30s preview, then restores on close/timeout
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Fix — Jukebox Multi-Song Free Queuing
- [x] Removed checkout step framing from SongBrowserModal (no payment required to queue)
- [x] Queue all selected songs in sequence (loop through selectedIds, 200ms stagger, summary toast)
- [x] Button renamed to "Add X Songs to Queue" / "Add to Queue" (no checkout language)
- [x] Offering modal kept as separate voluntary gifting covenant

## Redesign — Home Page (DiscoverPage at /)
- [x] Declaration header: "Living Nexus is on fire for Jesus"
- [x] New headline: "A cryptographic provenance layer for creative works."
- [x] #MainlyMusic tagline
- [x] WID explanation block updated (two layers: individual WIDs + WID-ALB)
- [x] Creator/Fan value split section added (two cards below hero)
- [x] Genre discovery filter (kept, working)
- [x] Latest Releases grid (kept, working)
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Phase — v2.7.2
- [ ] What's New: bump to v2.7.1 with two entries (Jukebox Free Multi-Queue, Declaration-First Homepage)
- [ ] Jukebox queue count badge on sidebar icon (live count, gold, 9+ cap)
- [ ] Creator/Fan value cards on Manifesto page (reuse DiscoverPage component, "The Covenant in Practice" header)

## Phase — v2.7.2 [COMPLETE]
- [x] What's New v2.7.1 entries (Jukebox Free Multi-Queue, Declaration-First Homepage) — CURRENT_VERSION bumped to v2.7.1
- [x] Jukebox queue count badge: jukeboxQueueCount added to PlayerContext; TogetherPage syncs pending queue length every 5s; MainLayout renders gold solid badge replacing LIVE badge when count > 0; clears on room leave
- [x] Creator/Fan value cards on Manifesto page — "The Covenant in Practice" section with gold-bordered Creator card and dark Fan card, above CTA row
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Feature — Track Download Button (Option A)
- [x] Audited: /api/download/:songId already fully built in server/downloadRoute.ts with ID3 tags (LNWID, LN_VERIFY_URL, cover art, AI consent, Colossians 1:17 attribution)
- [x] Download button added to PlayerBar compact bar (permission-aware: shows only when downloadPermission is 'free' or 'tipped'; routes through /api/download/:songId)
- [x] Song detail page already had download button wired via triggerTaggedDownload helper
- [x] Creator profile page already had download button wired via triggerTaggedDownload helper
- [x] WID embedded in filename via server/downloadRoute.ts: {title} — {artist} [{witnessId}].mp3
- [x] ID3 metadata: title, artist, comment (Living Nexus WID: ...), LNWID + LN_VERIFY_URL user-defined text fields
- [x] Option B documented: in-app download library inside APK, My Downloads screen, offline playback
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Feature — Batched Archive Download (Dashboard)
- [ ] Install jszip dependency
- [ ] Add /api/download/batch/:batchIndex route to downloadRoute.ts (streams ZIP with audio + certificates + README.txt)
- [ ] Add songs.getMyBatchInfo tRPC query (returns batch metadata: count, titles, WIDs per batch)
- [ ] Add "Download My Archive" section to Dashboard page with batch list and per-batch download buttons
- [ ] WID embedded in every filename: {trackNumber}_{title}_[{witnessId}].mp3
- [ ] Certificate PDFs included in certificates/ subfolder when available
- [ ] README.txt with title, WID, creator per track
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Feature — Batched Archive Download [COMPLETE]
- [x] /api/download/batch/:batchIndex route in downloadRoute.ts — streams ZIP with ID3-tagged audio + WID certificate PDFs + README.txt
- [x] /api/download/batch-info route — returns batch metadata (count, titles, WIDs, hasCertificate, hasAudio per track)
- [x] Archive tab added to Dashboard (6th tab, FileArchive icon, blue accent)
- [x] ArchiveTab component: fetches /api/download/batch-info on mount, shows batch cards with track count, expand/collapse track list, Download ZIP button per batch
- [x] Download ZIP triggers fetch → Blob → anchor click with correct filename from Content-Disposition header
- [x] WID info callout explaining ID3 embedding and certificate bundling
- [x] Empty state for creators with no tracks yet
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Phase — v2.7.3 [COMPLETE]
- [x] Download button in PlayerBar compact bar (ID3-tagged, permission-aware)
- [x] Download My Archive tab in Dashboard (batch ZIP downloads with WID certificates)
- [x] What's New modal bumped to v2.7.3 with two new entries
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Feature — APK Download Page (/download)
- [x] APK copied to server/assets/LivingNexus-v1-release.apk (served server-side, not in Vite build)
- [x] GET /apk/download route added to downloadRoute.ts — streams APK with correct Content-Type, Content-Disposition, Content-Length headers
- [x] DownloadPage.tsx created — standalone page (no MainLayout/PlayerBar), dark theme, gold icon glow, download button, install steps, iOS PWA note, doctrine tagline
- [x] /download route registered in App.tsx as public standalone (same pattern as /verify)
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Feature — Vertical Volume Popup
- [x] Replace horizontal volume slider with vertical popup (tap volume icon → popup with vertical range input, % label, mute icon, click-outside to close)
- [x] Apply to both collapsed and expanded player bars

## Feature — Explore Two Modes
- [x] Server: add optional `randomize: boolean` + `seed: number` params to getPublicSongs, use ORDER BY RAND(seed) when randomize=true
- [x] Explore page: Mode 1 — infinite scroll with IntersectionObserver, loads PAGE_SIZE*page records, sentinel at bottom
- [x] Explore page: Mode 2 — Randomize button reshuffles grid with new seed on each click, scrolls to top, brief fade animation
- [x] Mode toggle UI in Explore header (Infinite / Randomize pill toggle)

## Bug — Explore Infinite Scroll Seizure
- [x] Infinite scroll loops/seizures fixed — switched to offset-based pagination (offset += PAGE_SIZE per page), accumulate pages client-side, fetchedOffsetRef guards against double-fetching, sentinel only triggers when not already loading.

## Feature — Image Position Adjuster (Drag to Reposition) [COMPLETE]
- [x] DB: add bannerPositionX/Y (default 50) to users table
- [x] DB: add coverPositionX/Y (default 50) to songs table
- [x] DB: add coverPositionX/Y (default 50) to collections table
- [x] Build reusable ImagePositioner component (drag + touch, objectPosition preview, Save/Reset buttons)
- [x] Wire into profile banner upload flow
- [x] Wire into track cover art upload flow
- [x] Wire into collection cover art upload flow
- [x] Apply objectPosition on all render sites (profile page banner, song cards, collection cards, discover/explore/liked/archive/playlist/together/registry)
- [x] tRPC mutations: updateBannerPosition, updateSongCoverPosition, updateCollectionCoverPosition

## Feature — v2.8.0 Creator Control Suite [COMPLETE]
- [x] Reposition button overlay on existing banners (ProfilePage + CreatorProfilePage owner view)
- [x] Avatar position adjuster — wire ImagePositioner into avatar upload/reposition flow
- [x] What's New modal v2.8.0 entry: Drag to Reposition feature announcement
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Feature — Platform Quality Sprint (v2.9.0) [COMPLETE]
- [x] Audit likes tracking — 115 likes in DB, toggleLike writes correctly, display bug was zero tips (not zero likes)
- [x] Audit gifts/Stripe — MoshAIMusic Stripe enabled, 0 tips = no payments made yet, webhook handler correct
- [x] Creator Analytics Dashboard — new Analytics tab: plays/likes/gifts/downloads summary cards + track performance table + 30-day plays trend chart (recharts BarChart)
- [x] Three-zone track card interaction doctrine — cover art → loads player, title → /song/:id, artist → /creator/:id; creatorId + coverPositionX/Y propagated to all 7 track-building sites
- [x] Session persistence — queue + currentIdx + queueContext saved to sessionStorage on every change, restored on reload (never auto-plays)

## Feature — Founder's Era Supporter Recognition System [COMPLETE]
- [x] DB: add platformSupporters table (userId, tier, totalGifted, firstGiftAt, stripePaymentIntentId)
- [x] DB: add supporterTier enum (supporter=$1+, patron=$25+, covenant=$100+) to users table
- [x] DB helper: getSupporter, upsertSupporter, getAllSupporters
- [x] tRPC: supporters.getAll (public), supporters.getMyStatus (protected), supporters.createPlatformGiftCheckout (protected)
- [x] Stripe: platform gift checkout session (no transfer_data — goes to platform), webhook writes to platformSupporters
- [x] /founders page: header + countdown, tier info cards, gift amount buttons ($1/$5/$10/$25/$100), Supporters Wall
- [x] SupporterBadge component (✓ Supporter / ⧡ Patron / 🔐 Covenant Partner)
- [x] Founders Era banner on homepage (clickable → /founders, shows days remaining)
- [x] Login welcome modal: Version A (existing founder — "Welcome back, Founder."), Version B (new user — "Keep The Light On" CTA)
- [x] Wire SupporterBadge to CreatorProfilePage and ProfilePage
- [x] Add /founders route to App.tsx
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Bug Fix — ImagePositioner Modal Off-Screen on Mobile
- [ ] ImagePositioner modal renders below the fold on mobile (user must scroll to find it)
- [ ] Fix: ensure fixed overlay uses `position: fixed; top: 0; left: 0; width: 100%; height: 100%` with `overflow-y: auto` and modal card centered with `margin: auto`
- [ ] Fix all inline modal wrappers in ProfilePage (banner + avatar positioners) with same pattern
- [ ] Verify on narrow viewport (375px) that modal is always visible without scrolling

## Refactor — Inline Slider Repositioner (Replace Drag Modal) [COMPLETE]
- [x] Rewrite ImagePositioner as inline slider component (X/Y range inputs, live preview, presets, Save/Cancel) — no modal, no drag
- [x] ProfilePage banner: replace modal with inline BannerRepositioner rendering below the banner
- [x] CreatorProfilePage banner: same inline pattern for owner view
- [x] ProfilePage avatar: replace modal with inline slider below the avatar circle
- [x] EditTrackPanel cover art: inline slider below the cover art thumbnail
- [x] DashboardPage collection cover: inline slider below the collection cover thumbnail
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Bug Fix — ImagePositioner objectPosition & DB Persistence [COMPLETE]
- [x] Verify objectPosition is applied as `${x}% ${y}%` (x=horizontal, y=vertical) in ImagePositioner preview — confirmed correct
- [x] Verify all save mutations (banner, avatar, cover, collection) actually write to DB — confirmed writing (DB shows bannerPositionX:28, avatarObjectPosition:"7% 23%")
- [x] Fix CreatorProfilePage banner render: was reading stale `creator.bannerPositionX` from cache, now uses `bannerPos` state
- [x] Fix EditTrackPanel: saveCoverPosition now uses separate mutation that doesn't close the panel
- [x] Add success toast to DashboardPage collection cover position save
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Cover Art Positioner — Full System Rebuild [COMPLETE]
- [x] Audit: schema coverPositionX/Y on songs table confirmed
- [x] Audit: updateSongMetadata DB helper confirmed
- [x] Audit: updateMetadata tRPC procedure confirmed
- [x] Audit: EditTrackPanel cover positioner — full flow traced
- [x] Audit: ArchivePage song card cover art display — fixed (was missing artUrl + coverPositionX/Y in buildTrack)
- [x] Audit: ProfilePage My Songs tab cover art display — confirmed correct
- [x] Audit: CreatorProfilePage song card cover art display — confirmed correct
- [x] Audit: Player bar / Now Playing panel cover art display — fixed (was missing objectPosition on all 5 player surfaces)
- [x] Audit: Home page / Explore page song card cover art display — confirmed correct
- [x] Fix: ArchivePage buildTrack now includes artUrl + coverPositionX/Y
- [x] Fix: PlayerBar desktop large art panel — objectPosition added
- [x] Fix: PlayerBar mini 56px thumbnail — objectPosition added
- [x] Fix: MobilePlayerPanel mini bar thumbnail — replaced hardcoded object-top with objectPosition
- [x] Fix: MobilePlayerPanel expanded full-screen art — replaced hardcoded object-top with objectPosition
- [x] Fix: TheaterPlayer full-width art panel — objectPosition added
- [x] Fix: DashboardPage My Songs tab — added Edit button (pencil icon) that opens EditTrackPanel
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Bug Fix — Horizontal Slider Non-Responsive in ImagePositioner [COMPLETE]
- [x] Diagnose: objectPosition X has no effect when image fills container width (zero horizontal overflow)
- [x] Fix: replaced <img object-cover> preview with background-image + background-size:cover + background-position:X% Y%
- [x] background-position always moves the focal point regardless of image aspect ratio
- [x] Both horizontal AND vertical sliders now produce visible movement on all image types
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Living Pulse — Notification Badge System [COMPLETE]
- [x] Audit: existing notifications, events, comments, tips schema — solid foundation confirmed
- [x] DB: add lastVisitedActivityAt + lastVisitedDashboardAt to users table (db:push applied)
- [x] DB helpers: getNewEventCountForCreator, touchActivityVisit, touchDashboardVisit, getDashboardDeltas
- [x] tRPC: notifications.newEventCount, notifications.touchActivity, notifications.touchDashboard, notifications.dashboardDeltas
- [x] Auto-create notifications: tip webhook → notifies song owner on gift received
- [x] Comment creation already notifies song owner (confirmed wired)
- [x] Sidebar MainLayout: gold badge on Signals nav item (unread count), gold badge on Dashboard (total activity), polls every 60s
- [x] Dashboard Activity tab: pulsing orange badge showing new event count since last visit, clears on click
- [x] Dashboard stat cards: +N new delta badges for Total Plays and Gifts Received (TrendingUp icon, orange pill)
- [x] NotificationsPage: auto-mark all read on mount (1.5s delay so user sees unread state first), invalidates sidebar badge
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Bug Fix — Batch Upload Track Order + Collection Cover Art + Zoom [COMPLETE]
- [x] ImagePositioner: added zoom slider (100–200%, background-size driven, shows Fit/N% label, Reset Zoom button appears when zoom > 100)
- [x] Batch upload: added trackOrder column to songs schema (db:push applied)
- [x] Batch upload: batchUpload procedure now passes song IDs in upload order to linkSongsToCollection
- [x] Batch upload: linkSongsToCollection sets trackOrder 1-based per song; getSongsByCollectionId orders by trackOrder ASC
- [x] Collection cover art: CreatorProfilePage Albums section now uses collection.coverArtUrl (not albumSongs[0].coverArtUrl)
- [x] Collection cover art: tracks within each album sorted by trackOrder for correct display order
- [x] TypeScript: 0 errors | Vitest: 51/51 passing

## Phase X: Banner Positioner Visual Fix
- [x] Fix CreatorProfilePage banner positioner: increase preview height, add visual separator from actual banner, improve controls panel contrast and readability
- [x] Ensure ImagePositioner preview accurately represents the actual banner (no extra dark overlay)
- [x] Polish controls panel: better background contrast, clearer label hierarchy

## Phase Y: ImagePositioner Overhaul + Banner Gold Border
- [x] Fix auto-zoom bug: images start zoomed-in instead of fit — zoom=100 should mean true contain/fit not cover
- [x] Add hard boundary frame to ImagePositioner preview showing exact crop area
- [x] Add stretch-to-fit mode: allow image to stretch to fill boundary without cropping
- [x] Add elegant gold border to CreatorProfilePage banner

## Phase Z: Profile Presence + What's New v2.15.0
- [x] Apply gold border to ProfilePage banner (owner view) — parity with CreatorProfilePage
- [x] Replace empty banner gradient with gold-framed Upload CTA on ProfilePage
- [x] Replace empty banner gradient with gold-framed Upload CTA on CreatorProfilePage (owner view)
- [x] Update What's New modal to v2.15.0 with entries: Banner Positioning Modes, Gold Banner Frame, Empty Banner Upload Prompt
- [x] Persist version acknowledgment (user_seen_version = 2.15.0)

## Phase AA: Smart Banner Normalization (AI-Assisted)
- [x] Remove Stretch as default — Stretch is explicit override only, never auto-applied
- [x] Fix all banner rendering to use object-fit: cover (never fill/stretch)
- [x] Auto-select mode on upload based on aspect ratio: wide→crop, tall→crop, square→crop (stretch only on explicit user choice)
- [x] Add server-side AI focal point detection: LLM vision call on banner upload, returns {x, y} focal point percentage
- [x] Wire focal point result into initialX/initialY of ImagePositioner so image auto-centers on subject
- [x] Update ImagePositioner default mode to "crop" (not "fit"), position sliders active by default
- [x] Add "Auto" badge to position sliders when focal point was AI-detected
- [x] Ensure banner on CreatorProfilePage and ProfilePage never distorts — only crops or fits

## Phase AB: Direct-Manipulation Banner Editor
- [x] Replace slider-based ImagePositioner with drag-to-reposition (mousedown+move, touch support)
- [x] Add scroll-to-zoom on the canvas (wheel event, pinch on mobile)
- [x] Add double-click to reset center (x=50, y=50, zoom=110)
- [x] Move all mode buttons + save/cancel to a thin bottom dock (40-48px, outside the image)
- [x] Remove heavy gold "Save Position" bar — replace with small Save button in dock, only highlighted when changes exist
- [x] Contextual overlays only: zoom % indicator and crosshair alignment guides appear during drag/scroll and fade out after 1.5s
- [x] Reduce visual weight in editing mode: muted colors, no thick borders on canvas, utility-first
- [x] Stretch mode button visually de-emphasised (small, grey, ⚠ label) — never dominant
- [x] Preserve AI focal badge in dock area (not on canvas)

## Phase AC: Unified Direct-Manipulation Interaction Language
- [x] Add keyboard shortcut layer to ImagePositioner: R=reset, +/-=zoom, Enter=save, Esc=cancel
- [x] Keyboard hint strip appears in dock only when canvas is focused, invisible otherwise
- [x] Update all cover art positioner call sites to use unified ImagePositioner (drag/scroll/double-click)
- [x] Update avatar positioner call sites to use unified ImagePositioner
- [x] Update What's New modal to v2.17.0 — system-wide interaction language shift entry
- [x] Ensure all three editors (banner, cover art, avatar) share identical interaction model

## Phase AD: Profile Header Recomposition
- [x] Audit CreatorProfilePage header — map all elements, identify bleed sources and redundant metrics
- [x] Audit ProfilePage header — map all elements, identify bleed sources and redundant metrics
- [x] CreatorProfilePage: controlled backdrop layer prevents banner bleed into header zone
- [x] CreatorProfilePage: avatar + name + WID anchored left, no float
- [x] CreatorProfilePage: signals (follower count, track count, supporter badge) minimal, right-aligned
- [x] CreatorProfilePage: remove all redundant metric sections below the header
- [x] ProfilePage: same controlled backdrop layer system
- [x] ProfilePage: identity anchored left, signals right-aligned
- [x] ProfilePage: remove redundant metric sections
- [x] Both pages: header must not compete visually with creator content below

## Phase AE: System-Wide Artwork Normalization (v2.17.0 aligned)
- [x] Audit all image rendering sites: songs cover art, collection covers, avatars, banners, explore cards, track players
- [x] Identify all object-fit:fill/stretch/contain usages that cause distortion
- [x] Map all records missing coverPositionX/Y, bannerPositionX/Y, avatarPositionX/Y
- [x] Server: snapshot current position metadata to normalization_audit table before any changes
- [x] Server: apply cover+focal defaults (x=50, y=50, zoom=110) to all records missing position data
- [x] Server: flag records with unusual aspect ratios or missing artwork as edge cases for creator review
- [x] Frontend: enforce object-fit:cover on all song cover art render sites
- [x] Frontend: enforce object-fit:cover on all collection cover render sites
- [x] Frontend: enforce object-fit:cover on all avatar render sites
- [x] Frontend: enforce object-fit:cover on all banner render sites
- [x] Frontend: apply objectPosition from DB fields consistently across all render sites
- [x] Admin: add edge-case review panel surfacing flagged records
- [x] Normalization report: document all changes made, records updated, edge cases flagged

## Phase AF: Mobile Global Player — Full-Viewport Layer
- [x] Audit MobilePlayerPanel, PlayerBar, PlayerContext — map state, props, layout coupling
- [x] Build MobilePlayerLayer as a React portal (fixed, z-[9999], detached from sidebar/layout)
- [x] Implement three-state machine: mini → expanded → cinematic
- [x] Mini state: 64px bottom bar, artwork thumbnail, title/artist, play/pause, tap to expand
- [x] Expanded state: full-screen sheet, large artwork, scrubber, controls, queue, lyrics toggle, swipe-down to mini
- [x] Cinematic state: edge-to-edge artwork/video, no container constraints, minimal overlay controls (fade in on tap)
- [x] Landscape orientation: detect and reduce UI to essential controls only
- [x] Gesture layer: swipe-up to expand, swipe-down to mini/close, tap-artwork to cinematic
- [x] Remove old MobilePlayerPanel from MainLayout, inject MobilePlayerLayer as portal sibling
- [x] Preserve all PlayerContext state (currentTrack, isPlaying, queue, progress, volume)

## Phase AG: Profile Header Scale-Up (100% zoom parity with 200%)
- [x] CreatorProfilePage: increase banner height from h-48 to h-64 or h-72
- [x] CreatorProfilePage: increase avatar size from w-28/h-28 to w-40/h-40 or larger
- [x] CreatorProfilePage: scale up name typography (text-2xl → text-4xl or larger)
- [x] CreatorProfilePage: scale up handle, bio, and signal text sizes
- [x] CreatorProfilePage: increase header section padding and spacing
- [x] CreatorProfilePage: increase gold border weight and corner accent size
- [x] ProfilePage: same banner/avatar/typography/spacing scale-up
- [x] Both pages: ensure layout remains clean and non-cluttered at 100% zoom

## Phase AH: Avatar Positioner Layout Fix
- [x] Fix avatar ImagePositioner on ProfilePage: currently opens as full-width inline block breaking layout
- [x] Convert to compact floating panel (fixed/absolute position) anchored near avatar, max-w ~320px
- [x] Panel should not disrupt the header row layout when open
- [x] Close on outside click or Esc

## Phase AI: ImagePositioner Dock Layout Fix
- [x] Fix dock overflow: mode buttons and Save/Cancel cramming into one unreadable row
- [x] Restructure dock: row 1 = Fit/Crop/Str mode buttons; row 2 = Cancel + Save
- [x] Keyboard hint strip only visible when canvas is focused, hidden otherwise
- [x] Dock total height should not exceed 80px

## Phase AJ: Explore Grid Column Reduction
- [x] DiscoverPage/ExplorePage: reduce grid from 5-col to 3-col at xl, 4-col at 2xl
- [x] HomePage track grid: apply same column reduction
- [x] CreatorProfilePage track grid: apply same column reduction
- [x] Any other track card grid surfaces: apply same reduction

## Phase AK: Queue vs Collection Separation
- [x] Audit all "Add to Queue" call sites across the codebase
- [x] Add playNext() to PlayerContext — inserts track after current position, session-only
- [x] Verify queue state is never persisted to localStorage or DB
- [x] Add addToMyList server procedure: accepts songId, optional playlistId, stores WID in user collection
- [x] Build AddToMyListModal: shows user's playlists, create new list option, confirm button
- [x] Replace all "Add to Queue" labels with "Play Next" (queue) and "Add to My List" (collection)
- [x] Update track context menus, player action rows, and any other queue action surfaces
- [x] Write Vitest for addToMyList procedure

## Phase AL: Fix Banner Overlap on Creator Profile
- [x] Set banner as background layer (position: relative container, banner fills it absolutely)
- [x] Fix banner height (responsive: 200px mobile, 280px desktop)
- [x] Position avatar as absolute, overlapping bottom of banner (translateY 50%)
- [x] Add ring border + dark background to avatar for visual separation
- [x] Push profile content down (padding-top accounts for avatar overhang)
- [x] Ensure z-index: avatar (z-20) > banner overlay (z-10) > banner image (z-0)
- [x] Maintain responsive behavior across screen sizes

## Phase AM: Fix Cover Art Zoom in Expanded Player
- [x] Locate expanded player cover art img element
- [x] Replace object-fit: cover with object-fit: contain
- [x] Center image within its container
- [x] Add dark background fill for letterbox/pillarbox empty space
- [x] Apply max-width/max-height constraints to prevent oversized scaling
- [x] Maintain responsive behavior across devices

## Phase AN: Unified Media Rendering System (MRS)
- [x] Extend songs DB schema: add aspectRatio, focalPointX, focalPointY fields
- [x] Run pnpm db:push to migrate schema
- [x] Update server routers to expose/accept new fields
- [x] Build MediaAsset component with card/player/cinematic render modes
- [x] Implement Ken Burns zoom animation in cinematic mode
- [x] Add dark gradient overlay in player/cinematic modes
- [x] Add mouse parallax (desktop) and gyro tilt (mobile) in cinematic mode
- [x] Replace cover art in ExplorePage with MediaAsset card mode
- [x] Replace cover art in DiscoverPage with MediaAsset card mode
- [x] Replace cover art in CreatorProfilePage with MediaAsset card mode
- [x] Replace cover art in PlayerBar (desktop expanded) with MediaAsset player mode
- [x] Replace cover art in MobilePlayerLayer (expanded sheet) with MediaAsset player mode
- [x] Replace cover art in TrackCard with MediaAsset card mode
- [x] Write Vitest tests for new schema fields

## Phase AO: Homepage Messaging Hierarchy
- [x] Replace main headline with "Your work deserves to be witnessed, not lost"
- [x] Add micro-support line: "No algorithms. No ownership loss. Just creation, proven."
- [x] Move Witness ID / cryptographic explanation to subtext below headline
- [x] Update CTA button 1: "Upload & Witness Your Work"
- [x] Update CTA button 2: "Explore Witnessed Creations"
- [x] Expand Founder's Era description to explain significance of early registry participation

## Build Order Phase 1 — Stability
- [x] Add try/catch to all dashboard data loads
- [x] Replace generic error with "We couldn't load your dashboard right now"
- [x] Add Retry, Go to My Works, Report Issue actions on dashboard error
- [x] Implement partial rendering (no full crash)
- [x] Add error logging (userId, route, error)
- [x] Detect users with no works — show "Upload your first piece and get your WID" empty state

## Build Order Phase 3 — Homepage Routing
- [x] Route / → HomePage
- [x] Route /discover → DiscoverPage
- [x] Update sidebar nav accordingly

## Build Order Phase 2 — WID Interactive Panel & Trust Layer
- [x] Build WIDPanel component (clickable badge + full provenance modal + download)
- [x] Replace static WID badges in SongDetailPage with WIDPanel
- [x] Replace static WID badges in DashboardPage with WIDPanel
- [x] Add songs.getWitnessedCount public procedure (cached)
- [x] Add songs.getWitnessedVoices public procedure (6 most recent)
- [x] Build AnimatedCounter component
- [x] Build WIDTrustLayer section in HomePage (counter + Witnessed Voices strip)

## Build Order Phase 4 — WID Social Proof
- [x] Add Share button to WIDPanel (tweet pre-fill with WID + verify link)
- [x] Add Copy Link button to WIDPanel (copies verify URL)

## Build Order Phase 5 — My Lists Manage Mode
- [x] Add playlistVersions table to schema (playlistId, versionNum, widArray JSON, savedAt)
- [x] Run db:push for new table
- [x] Add playlists.saveVersion tRPC procedure
- [x] Add playlists.getVersions tRPC procedure
- [x] Add playlists.reorder tRPC procedure
- [x] Build MyListsTab component with drag-to-reorder and version history panel
- [x] Add My Lists tab to ArchivePage with tab switcher

## Build Order Phase 6 — Guild System Scaffold
- [x] Add guilds table (id, name, slug, description, bannerUrl, createdBy, isPublic, createdAt)
- [x] Add guildMembers table (guildId, userId, role: owner/admin/member, joinedAt)
- [x] Add guildPlaylistTracks table (guildId, songId, addedByUserId, position, addedAt)
- [x] Run db:push for guild tables
- [x] Add guilds tRPC router (list, getBySlug, create, getMix, addToMix, join, mine)
- [x] Build GuildPage (/guild/:slug) with hero, guild mix, members list, join button
- [x] Build GuildsListPage (/guilds) with create guild modal
- [x] Register /guilds and /guild/:slug routes in App.tsx
- [x] Add Guilds nav item to sidebar DISCOVER group
- [x] "added by" attribution on every guild mix track row

## Bug Fix: PlaylistManagePanel Infinite Re-render
- [x] Fix "Too many re-renders" in PlaylistManagePanel — setState called during render phase

## System Constraint: Eliminate Duplication + Homepage Merge
- [x] Audit all Collection models (playlists, guildPlaylistTracks, liked, archive) — identify duplicates
- [x] Audit all WID components — identify duplicates vs canonical WIDPanel
- [x] Audit all "add to" handlers — identify duplicates vs canonical AddToMyListModal
- [x] Audit all Work/Song model usages — confirm single canonical type
- [x] Merge DiscoverPage track grid into HomePage with genre pill row (All, Ambient, Gospel, Jazz, Electronic, Hip-Hop, Rock, R&B, Metal)
- [x] /discover kept as deep-link target; / routes to HomePage with embedded genre grid
- [x] Sidebar nav updated: Home (/), Discover (/discover) both present
- [x] AddToPlaylistButton replaced with AddToMyListModal in PlayerBar (both compact + expanded modes)
- [x] Inline witnessId text in MyListsTab replaced with canonical WIDPanel badge

## Nav Cleanup + Build Order Phase 7 & 8
- [x] Remove Discover nav item from sidebar (keep Home and Explore)
- [x] Redirect /discover to / so old links still work
- [x] Build Phase 7: External Playlists tab in Archive (YouTube/Suno URL import, read-only, labeled)
- [x] Add externalPlaylists table to schema (userId, name, sourceType, sourceUrl, tracksJson, createdAt)
- [x] Add externalPlaylists tRPC procedures (import, list, delete)
- [x] Build Phase 8: Background Playback ambient mode (separate queue, ambient volume control)
- [x] AmbientPlayerContext: isolated session-only state (track, isPlaying, volume, minimized)
- [x] AmbientWidget: floating bottom-right widget with YouTube iframe embed, volume control, minimize/close
- [x] ExternalPlaylistsTab: Play in Ambient button on each track row, ambient hint banner
- [x] YouTube oEmbed metadata fetch on import (title, author, thumbnail — no API key required)

## System Isolation + Sidebar Refactor
- [x] Sidebar simplified to exactly 6 primary items: Home, Explore, Listen Together, Guilds, Profile, Upload
- [x] Avatar + username at top clickable, routes to /profile
- [x] Active route: left accent bar + strong visual state
- [x] Removed from sidebar: Dashboard, My Works, Playlists, Liked Songs, Signals, Field Notes, Verify WID, Batch Upload, Witness Records, WID Specification, Lexicon, Redeem Code, Admin Panel, Artwork Normalization, Founders, Manifesto, Creator License
- [x] /learn page created combining WID Specification + Lexicon under one route
- [x] ProfilePage rebuilt as creator command center with 6 tabs: Overview, Works, Collections, Liked, Signals, Field Notes
- [x] Overview tab: stats grid, Stripe Connect status, recent activity feed
- [x] Works tab: all uploaded tracks with status badges, play count, copy link, open song page
- [x] Collections tab: playlists list with link to Archive for management
- [x] Liked tab: liked songs with artist name and link to song page
- [x] Signals tab: notifications inbox with unread badge + mark all read
- [x] Field Notes tab: journal entries preview with link to full Field Notes page
- [x] Settings utility bar added at bottom of Profile: Redeem Code, WID Spec & Lexicon, Founders, Log Out
- [x] Batch Upload button added to UploadPage header (top-right)
- [x] Admin Panel removed from UI; accessible via direct URL /admin (role-gated)
- [x] No new navigation items introduced — all features live inside existing systems

## Task 16: Convert to Quick Access Panel
- [x] Rename QuickRefSlider to QuickAccessPanel
- [x] Panel collapsed by default (edge handle only on load)
- [x] Panel is overlay (no layout shift)
- [x] Close on outside click
- [x] Content: global search input (primary)
- [x] Content: quick genre filters (calls DiscoveryFeed, same as homepage)
- [x] Content: recently played tracks (keep existing)
- [x] Remove: Quick Reference / Explore links / duplicate nav items
- [x] Smooth slide-in/out animation
- [x] Update MainLayout to use QuickAccessPanel

## Task 17: Reactions + Signals + Safety Audit
- [x] Add reactions table to schema (id, userId, songId, type, createdAt, unique userId+songId+type)
- [x] Push migration: pnpm db:push
- [x] Add songs.getReactions tRPC procedure (counts per emoji + user's selected reactions)
- [x] Add songs.toggleReaction tRPC procedure (upsert/delete, one per type per user per song)
- [x] Update SongDetailPage: optimistic UI for reactions, highlight user-selected, persist across sessions
- [ ] Fix Signals: remove any time-based auto-read or auto-archive logic
- [ ] Fix Signals: markAsRead only on user click/expand interaction
- [ ] Fix Signals: add "Mark all as read" button
- [ ] Safety audit: WID visible on every work, WIDPanel opens with metadata/provenance/verify
- [ ] Safety audit: Upload (single) works, Batch Upload accessible inside UploadPage
- [ ] Safety audit: Witness Records accessible via Profile → Works → View Records
- [ ] Safety audit: AddToMyListModal works everywhere, no duplicate add systems
- [ ] Safety audit: Admin Panel accessible via role-gated route only, not in UI
- [ ] Safety audit: Redeem Code accessible via Profile → Settings
- [ ] Safety audit: Search accessible via QuickAccessPanel

## Task 18: Mobile Player Restructure (Cinematic Mode + Action Layer)
- [x] Audit MobilePlayerPanel / NowPlayingPanel component structure
- [x] Right-side emotional action stack: Love (❤️), Share (🔁), Comment (💬) — vertical, floating
- [x] Functional row below player: Gift, Details, Sound — smaller, utility-focused
- [x] WID badge directly under track title — always visible, clickable, routes to /song/:id
- [x] Details slide-up panel: WID, Creator, License, Provenance, Tags
- [x] Dominant artwork: centered, full-bleed, gradient fade behind controls
- [x] Clean player controls: Shuffle, Prev, Play/Pause, Next, Repeat — more spacing, dominant play button
- [x] Tap artwork to toggle UI visibility (cinematic mode, auto-restores after 4s)
- [x] Floating heart pulse animation on Love tap (heartFloat keyframe)
- [x] Remove clutter from main view (Cinema Mode toggle, volume bar, tip button moved to Details/functional row)

## Task 19: Platform Audit + Data Restoration
- [x] Audit: trace all "Unknown" in song cards, profile, works tab to source queries
- [x] Fix: creator name/title/artwork binding in getSongs, getById, discover queries (nested creator object)
- [x] Fix: ArchivePage uses song.fileUrl (not audioUrl) and user profile name (not song.artistName)
- [x] Fix: ProfilePage Works tab uses user profile name instead of non-existent song.artistName
- [x] Restore: getTrendingWorks (score = plays + likes*3 + recency decay), wire to HomePage Trending Now
- [x] Add: myAnalytics query to ProfilePage Overview tab (totalPlays, totalLikes, totalGifts, week deltas)
- [x] Expand: Overview stats grid to 6 cards (Plays, Likes, Tracks, Gifts, Witnessing, Witnesses)
- [x] Add: per-work stats (plays ▶, likes ♥, gifts $) to Works tab song rows
- [x] Add: skeleton loading states to Works tab (5-row pulse skeleton)
- [x] All 95 tests passing, TypeScript 0 errors

## Task 20: Mobile Player Critical Fixes
- [x] Fix Details button handler — wire to openTrackDetailsDrawer(trackId) with tap feedback
- [x] Fix Gift button handler — wire to openGiftModal(trackId) with tap feedback
- [x] Fix mobile scroll lock — panel uses overflow-y-auto, no overflow:hidden trapping
- [x] Build reusable BottomSheet component (swipe-down to close, scroll inside, safe area aware)
- [x] Replace stuck Lyrics panel with BottomSheet (tap Lyrics → slide up full panel)
- [x] Add tabbed BottomSheet: Details / Lyrics / Comments tabs
- [x] Comments tab: input box visible, existing comments render, emoji reactions persist
- [x] Cinematic mode: NEVER empty — always shows title, creator, WID badge, cover art (controls fade to 0.15 opacity)
- [x] Cover art: MediaRenderer fallback chain (video → artwork → Music icon placeholder)
- [x] Video + audio sync: video.muted=true, audio.play(), video.loop=true, robust play/pause
- [x] All player interactions use one unified PlayerController (no duplicate logic)
- [x] 95 tests passing, TypeScript 0 errors

## Session: Bug Fixes + Feature Additions (Apr 1 2026)
- [x] Fix: Liked tab React key warning — getLikedSongs returns nested {song, creator} shape, map now uses item.song.id as key
- [x] Signals tab: mark individual notification as read on click (markOneRead mutation + invalidate)
- [x] Signals tab: markAllRead now also invalidates notifications.list (not just unreadCount)
- [x] Works tab: View Witness Records button (Shield icon) per track — navigates to /song/:id#witness-records
- [x] SongDetailPage: Added id="witness-records" anchor to Witness ID section for deep-link scrolling
- [x] ExplorePage: Added "Trending" mode pill — uses songs.trending procedure (score = plays + likes*3 + recency)
- [x] Branding: Removed all "Suno-inspired" references from code comments (CreatorProfilePage, SongDetailPage)

## Full Platform Audit (Apr 1 2026)
- [ ] TrackCard: Add WID badge (clickable → /verify/:witnessId) when track.witnessId exists
- [ ] TrackCard: Add AI disclosure badge (original/ai_assisted/ai_generated) when track.aiDisclosure exists
- [ ] ExplorePage: Add heart/like button (useLike hook) to each song card
- [ ] ExplorePage: Add gift/tip button to each song card (opens tip modal or navigates to song page)
- [ ] ExplorePage: Make WID badge clickable → /verify/:witnessId
- [ ] ExplorePage: Add AI disclosure badge to each song card
- [ ] Global: Verify all nav items link correctly (Guilds, Manifesto, Founders, Witness Registry)
- [ ] Global: Confirm Guilds page is functional (not placeholder) — it is built
- [ ] Global: Upload page caption/WID order confirmed correct — no fix needed
- [ ] Global: Profile stats confirmed working — no fix needed
- [ ] Global: Listen Together rooms/jukebox/gift confirmed working — no fix needed

## Platform Audit Session (2026-04-01)
- [x] Audit all pages for consistency and missing features
- [x] TrackCard: Add WID badge (clickable → /verify/:id) and AI disclosure badge
- [x] ExplorePage: Add ExploreCard sub-component with heart (useLike), gift button (TipModal), clickable WID badge, AI disclosure badge
- [x] ExplorePage: Verify genre filter pills and search working
- [x] Listen Together: Verified rooms, jukebox freeQueue, leaveOffering gift flow all working
- [x] Guilds: Verified fully built (list, create, join, posts) - not a placeholder
- [x] Profile: Verified all 6 stats, Stripe Connect card, witness network all wired
- [x] Upload: Verified caption only shows after WID generated, AI disclosure warning present, progress bar present
- [x] Navigation: Added Discover section to sidebar (Manifesto, Founding Creators, Witness Registry)
- [x] Mobile nav: Verified PRIMARY_NAV renders in mobile drawer
- [x] All routes verified: /guilds, /manifesto, /founders, /witness-registry all registered

## Bug Fixes (2026-04-01 session 2)
- [x] Fix ExplorePage three-dot context menu offset/clipping on first card (smart positioning)

## ExploreCard Redesign (2026-04-01)
- [x] Rewrite ExploreCard to match TrackCard architecture (avatar, artist row, genre pill, full action bar)

## Contextual Modal System (2026-04-01)
- [ ] Build ContextualModal primitive (anchor-based, edge-flip, mobile bottom sheet)
- [ ] Refactor AddToMyListModal to use ContextualModal with originRect
- [ ] Refactor TipModal to use ContextualModal with originRect
- [ ] Wire originRect capture in TrackCard, ExploreCard, and all card call sites

## Session: Mobile Bug Fixes (Apr 1 2026)
- [ ] NowPlayingPanel: fix cinematic artwork (full-screen blurred bg + centered art)
- [ ] NowPlayingPanel: fix Details button (navigate to song page)
- [ ] NowPlayingPanel: fix Share button (copy link / share sheet)
- [ ] NowPlayingPanel: fix queue icon on artwork (open queue panel)
- [ ] NowPlayingPanel: add comments section
- [ ] CreatorProfilePage: fix mobile name truncation (Nero's Shadow cut off)
- [ ] CreatorProfilePage: fix mobile stats/button layout overflow

## Phase 47: HomePage Layout Redesign
- [x] Witnessed Voices: expand from 6 to 8 panels (update server limit to 8, grid to 2×4)
- [x] Add Creators section: horizontal panning row of creator profile cards below Witnessed Voices
- [x] Discover Tracks: convert from 2-row grid to side-pane horizontal scroll (2 rows × 12 cards = 24 tracks)
- [x] Trending Now: convert from vertical list to same side-pane horizontal scroll (2 rows × 12 cards = 24 tracks)
- [x] Increase trending query limit from 5 to 24

## Phase 48: Modal + PlayerBar Fixes
- [x] TipModal: convert from centered overlay to origin-anchored ContextualModal (same pattern as AddToMyListModal)
- [x] TipModal: all call sites must pass originRect from the triggering gift button
- [x] PlayerBar: fix "Add to My List" button clipping/overlapping with volume and expand controls on right edge

## Phase 49: Discord Rich Embeds for /song/:id
- [x] Add server-side OG meta injection endpoint at GET /song/:id (SSR HTML with og:title, og:description, og:image, og:audio, twitter:card)
- [x] Serve cover art via a proxied/CDN URL that Discord's scraper can access (must be absolute HTTPS)
- [x] Add og:audio and og:audio:type for Discord audio player embed
- [x] Inject twitter:card = player for Twitter/X embed with audio
- [x] Ensure /index.html fallback still serves the SPA for real browsers
- [x] Test with Discord embed scraper (discordapp.com/api/oembed and opengraph.io)

## Phase 50: Fix OG Middleware HTML/JSON Collision
- [ ] OG middleware on / route returns HTML to logged-in users whose UA matches crawler patterns (curl, wget, etc.) — fix to only intercept when UA is a known bot and request is not an API call
- [ ] Verify no /api/trpc requests are intercepted by OG middleware

## Phase 50: Fix HTTP 414 URI Too Long (tRPC batch GET overflow)
- [x] Add bulk getLikeStatuses procedure: accepts array of songIds, returns map of {songId -> {liked, count}}
- [x] Update TrackCard to accept pre-fetched likeStatus/count props instead of firing individual queries
- [x] Update HomePage to fetch all like statuses in one bulk call after songs load
- [ ] Update ExplorePage similarly (deferred — explore page has its own pagination)
- [x] Add JSON error handler in Express for 414/4xx/5xx so HTML is never returned to tRPC clients

## Phase 51: Fix 414 Persistent (useLike still fires per-card)
- [x] Update useLike hook to accept optional skipQuery param so TrackCard can suppress individual getLikeStatus when prefetch data is available
- [x] Update TrackCard to pass skipQuery=true to useLike when prefetchedLiked is provided
- [ ] Increase Express server maxHeaderSize / URL limit to handle edge-case large batch requests (deferred - not needed now that queries are suppressed)
- [ ] Verify fix on production domain after publish

## Phase 52: Discord/iMessage Embed Video (og:video MP4)
- [x] Add server-side embed video generation: GET /api/song/:id/embed.mp4 (ffmpeg: cover art loop + audio)
- [x] Cache generated MP4 on S3 at embed-videos/{songId}.mp4, return cached URL on repeat requests
- [x] Update og.ts to include og:video + og:video:type=video/mp4 + og:type=video.other for Discord
- [ ] Add /api/oembed endpoint for Slack/Notion rich embed metadata (deferred)
- [ ] Add Share button UI on song detail page with platform-specific deep links (deferred)
- [x] Test embed on Discord, iMessage, Telegram after publish (verified og:video tags present in OG response)

## Phase 53: Three Feature Batch
- [x] ExplorePage: bulk like fix — replace per-card getLikeStatus/getLikeCount with getBulkLikeStatuses (same pattern as HomePage)
- [x] Admin: pre-generate embed videos mutation — iterates all songs without embedVideoUrl, queues background generation with progress tracking
- [x] Admin: trigger UI for pre-generate (button in admin panel with live progress counter)
- [x] Song detail page: Share button — copies canonical URL to clipboard
- [x] Song detail page: Share modal — shows embed preview card (Discord/iMessage style) so creator can verify before sharing
- [ ] Trigger embed video generation on song publish (hook into upload/publish flow)

## Phase 54: HomePage Regression Fixes
- [x] WID panels: fix data shape — show song title, creator name, and avatar instead of raw hash IDs
- [x] Creators carousel: fix featuredCreators procedure returning 0 tracks for all creators
- [x] HorizontalTrackGrid: wire track card clicks to global PlayerContext (addAndPlay)
- [x] TrackCard: fix isActive check to use currentTrackId instead of index-based comparison
- [x] HomePage mapSong: convert song.id to string for Track interface compatibility

## Phase 55: Mobile Player Fixes
- [x] Gift button in mobile expanded player does nothing — implement creative gift/tip modal with emoji appreciation + Stripe tip tabs
- [x] Details button in mobile expanded player does nothing — now collapses to mini and navigates to song page
- [x] Mobile mini player bar invisible at bottom of screen — increased height, added max(safe-area, 8px) padding for Android browser chrome

## Phase 56: Cinematic View Fix
- [x] Cinematic view shows blank black screen — fixed by using MediaAsset mode="cinematic" directly in CinematicLayer (was using mode="player" via ArtworkLayer)
- [x] Video load error fallback — added onError handler to both PlayerMedia and CinematicMedia so cover art shows if video fails to load on mobile

## Phase 57: UX Polish Sprint
- [x] Cinematic overlay: long swipe-up from mini bar (>120px) goes directly to cinematic; action tray (Gift/Share/Details) added to cinematic portrait controls
- [x] WID panels: redesigned as horizontal scroll row with 148×196px portrait cards, large cover art, WID badge, creator avatar, play button overlay, one-tap play via addAndPlay
- [x] Creator appreciation notifications: toggleReaction now sends in-app notification to creator when reaction is added (not removed), with emoji + sender name

## Phase 58: Social Sharing Embeds
- [x] Audited OG meta tags — fully implemented in server/og.ts (Phase 19 + Phase 52)
- [x] Confirmed: og:title, og:description, og:image, og:video (MP4 embed), og:audio (MP3), twitter:card, twitter:player:stream all present for real song IDs
- [x] Embed videos cached on S3/CloudFront at embed-videos/{songId}.mp4 — Discord shows inline video player after first generation
- [x] Direct MP3 URL in og:audio tag — iMessage/Telegram can play directly from the link
- [x] Issue was user testing with truncated ID (13200 vs real 7-digit IDs like 1320021) — no code fix needed

## Phase 59: Discord Embed Fix (Production)
- [x] Diagnose why Discord gets generic site embed instead of song-specific OG tags on production
  - Root cause: Manus platform pre-renderer executes React and serves Helmet tags; server/og.ts is bypassed in production
  - Pre-renderer was serving incomplete Helmet tags from SongDetailPage.tsx (missing artist name, og:audio, og:video, og:site_name)
- [x] Fix Helmet tags in SongDetailPage.tsx to include complete OG metadata:
  - og:title now includes artist name: "Song Title — Artist Name | Living Nexus"
  - og:site_name added
  - og:audio + og:audio:type added (direct MP3 link)
  - og:video + og:video:type/width/height added (MP4 embed if available)
  - og:image:width + og:image:height added
  - og:url uses canonical https://www.livingnexus.org/song/:id
  - twitter:card switches to "player" when embedVideoUrl present
  - twitter:player, twitter:player:stream tags added
- [x] Root cause confirmed: Manus Cloudflare CDN intercepts ALL requests (not just bots) and generates its own OG tags from whatever HTML the page returns for normal browser requests — Express server OG route was never reached
- [x] Fix: Removed isCrawler UA gate from /song/:id and /creator/:id routes in server/og.ts so ALL requests get OG-injected HTML from Express server
- [x] Verified: Regular browser requests to /song/:id now return song-specific OG tags (og:title includes artist name, og:image is cover art, og:audio/og:video present)
- [x] React SPA still loads correctly — HTML structure intact with #root div and module scripts
- [ ] Test with real Discord paste after publish (requires new deployment)

## Phase 60: Discord Inline Audio Player Embed
- [x] Build /embed/song/:id — standalone iframe player page (dark bg, blurred cover art, title, artist, HTML5 audio with play/pause/progress)
- [x] Register /embed/song/:id as an Express route in server/embedRoute.ts (pure HTML/CSS/JS, no React)
- [x] Register embed route BEFORE X-Frame-Options header middleware in server/_core/index.ts
- [x] Embed route sets X-Frame-Options: ALLOWALL and Content-Security-Policy: frame-ancestors * so Discord can iframe it
- [x] Update server/og.ts: og:video now points to /embed/song/:id with og:video:type="text/html" (YouTube pattern)
- [x] og:video:width=480, og:video:height=270 (Discord's preferred embed player dimensions)
- [x] twitter:player points to /embed/song/:id, twitter:player:stream still carries raw MP4 for iMessage/Telegram
- [x] Added songId param to buildSongOgTags() — embed iframe URL auto-generated for all song pages
- [x] Verified: og:video = https://www.livingnexus.org/embed/song/1320021, type=text/html
- [x] Verified: embed page renders title/artist/audio correctly, X-Frame-Options: ALLOWALL confirmed
- [x] 95 tests passing, 0 TypeScript errors
- [ ] Test Discord embed shows inline player after publish

## Phase 61: Fix Gift/Tip Button - Require Proper Checkout Flow
- [x] Diagnosed: TipModal.tsx on Explore page was using addTip() (local state only) — no Stripe, no payment, fake success toast
- [x] Fixed: TipModal.tsx now uses trpc.tips.createTipCheckout.useMutation() — real Stripe Checkout
- [x] Fixed: Send button opens Stripe checkout in new tab, no success state until user completes payment on Stripe
- [x] Added disclaimer: "You'll be redirected to Stripe's secure checkout. No charge until you confirm."
- [x] Button shows "Opening Checkout…" loading state while mutation is pending
- [x] Minimum $1.00 validation enforced before calling Stripe
- [x] 95 tests passing, 0 TypeScript errors

## Phase 62: Discord Embed Fix via oEmbed + Direct MP4
- [x] Implemented /api/oembed endpoint (server/oembedRoute.ts) returning song-specific JSON:
  - title: "Titus 3 (Stripped Down) — MoshAIMusic"
  - author_name: artist name
  - thumbnail_url: cover art URL
  - description: genre + WID + play count
  - html: iframe embed player at /embed/song/:id
  - provider_name: "Living Nexus"
- [x] Registered oembedRouter in server/_core/index.ts before tRPC middleware
- [x] Added generic oEmbed discovery <link> to client/index.html:
  - href="https://www.livingnexus.org/api/oembed?url=https://www.livingnexus.org/"
  - Discord reads this from whatever HTML the Manus CDN serves
- [x] Updated injectOg() in og.ts to also inject per-page oEmbed discovery link with exact song URL
- [x] Verified: /api/oembed?url=.../song/1380002 returns correct JSON with song title, artist, cover art
- [x] Verified: /song/1380002 HTML contains per-page oEmbed link with encoded song URL
- [x] 95 tests passing, 0 TypeScript errors
- [ ] Publish and test Discord embed shows song title + cover art (requires new deployment)

## Phase 63: Provenance Distribution Layer (PDL)
- [x] Built /share/:wid — server-rendered Express route (server/shareRoute.ts)
  - Looks up song by WID from database via getSongByWitnessId()
  - Returns 200 HTML with correct og:title, og:image, og:audio, og:description, og:video
  - Injects per-page oEmbed discovery link: /api/oembed?wid=:wid
  - Browser redirect via <meta http-equiv="refresh"> + JS to /song/:id
  - Served under /share/* — Manus CDN does NOT override (not a known static page route)
  - Sets X-Frame-Options: ALLOWALL, Cache-Control: no-cache
- [x] Updated /api/oembed to accept wid= parameter (alongside url=)
  - Returns: title, author_name, thumbnail_url, html (iframe), provider_name, url, description
- [x] Registered shareRouter in server/_core/index.ts BEFORE X-Frame-Options middleware
- [x] Updated share buttons across the app to use /share/:wid when WID is available:
  - MobilePlayerPanel.tsx handleShare()
  - MobilePlayerLayer.tsx handleShare()
  - PlayerBar.tsx share button onClick
  - SongDetailPage.tsx copyLink()
- [x] Verified: /share/WID-MUS-20035929-B62A482B returns HTTP 200 with all correct OG/Twitter tags
- [x] Verified: og:title = "Titus 3 (Stripped Down) — MoshAIMusic"
- [x] Verified: og:image = actual cover art URL
- [x] Verified: og:video = /embed/song/1380002 (iframe, text/html)
- [x] Verified: twitter:player:stream = direct MP4 URL
- [x] Verified: oEmbed discovery link present in HTML
- [x] Verified: /api/oembed?wid=WID-MUS-20035929-B62A482B returns correct JSON
- [x] Verified: browser redirect to /song/1380002 via meta refresh + JS
- [x] 95 tests passing, 0 TypeScript errors
- [ ] Publish and test Discord embed shows song title + cover art using /share/:wid URL

## Phase 64: Canonical Work API Layer — WID Protocol
- [x] Built GET /api/work/:wid in server/workRoute.ts — read-only, immutable canonical provenance endpoint
- [x] Returns full provenance record: protocol, wid, title, creator, registeredAt, genre, bpm, keySignature, moodTags, aiDisclosure, hash (fileHash, lyricsHash, ecdsaPublicKey, ecdsaSignature, harmonicSignature), media (coverArtUrl, audioUrl, videoUrl, embedPlayerUrl, certificateUrl), license (downloadPermission, aiConsent, coWriters), stats (playCount, tipCount), lineage (ai_transform derivatives)
- [x] 404 with WID/1.0 error envelope if WID not found
- [x] 405 Method Not Allowed for POST, PUT, PATCH, DELETE — mutation explicitly blocked
- [x] CORS: Access-Control-Allow-Origin: * — open for external consumers
- [x] Cache-Control: public, max-age=300, stale-while-revalidate=60
- [x] X-WID-Protocol: 1.0 response header on all responses
- [x] Registered app.use("/api/work", workRouter) in server/_core/index.ts
- [x] Verified: GET /api/work/WID-MUS-20035929-B62A482B returns full record with title, creator, hash, media, lineage
- [x] Verified: CORS headers present, X-WID-Protocol: 1.0 present
- [x] Verified: 404 returns structured error with protocol field
- [x] 95 tests passing, 0 TypeScript errors

## Phase 65: Archive/Dashboard Improvements
- [x] Fix 1: Added Edit / Delete action buttons to each track row in ArchivePage
  - Edit button — navigates to /edit/:id
  - Delete button (trash icon) — opens confirm-delete modal
  - Drag handle (☰) visible on left side of each row for reordering
- [x] Fix 2: Confirm-delete modal with WID preservation notice
  - Modal text: "This track will be removed from your public archive. Your WID record is permanent and cannot be deleted."
  - Cancel / Confirm Delete buttons
  - Soft delete: sets status='Deleted', isPublic=false in db.ts — WID record preserved forever
- [x] Fix 3: Drag-to-reorder track list
  - HTML5 drag API on track rows (no external library)
  - Persists order to DB via reorderMySongs() in db.ts + songs.reorderMySongs tRPC procedure
  - Visual drag indicator (opacity change + cursor change on dragged item)
- [x] reorderMySongs added to server/db.ts (exported) and server/routers.ts (imported + procedure)
- [x] deleteSong() in db.ts converted to soft delete (status='Deleted', isPublic=false)
- [x] 95 tests passing, 0 TypeScript errors
- [x] Server running cleanly after all changes

## Phase 66: LNA Archive Sidebar + Batch Actions
- [ ] Rename sidebar "Archive" label to "LNA — Archive" with gold text color (#c9a84c)
- [ ] Add song count badge to LNA Archive sidebar nav item
- [ ] Add batch select checkboxes to each track row in ArchivePage
- [ ] Add batch actions bar (Delete Selected / Clear) when tracks are selected
- [ ] Replace text drag handle with GripVertical icon (lucide-react)
- [ ] Add track number display (index + 1) to each row
- [ ] Show WID in monospace under track title
- [ ] Confirm /archive route is auth-guarded and sidebar links correctly
- [ ] Remove Facebook pixel from index.html if present

## Phase 66: Archive Page & Sidebar Improvements
- [x] Add "LNA — Archive" nav item to MainLayout sidebar (gold label, Archive icon, song count badge)
- [x] Archive nav item visible only when authenticated (desktop + mobile)
- [x] Archive badge: gold pill showing non-deleted track count, fetched from mySongs query
- [x] ArchivePage: batch-select mode with CheckSquare/Square checkboxes per row
- [x] ArchivePage: "Select" toolbar button to enter/exit batch mode, "All" and "Clear (n)" helpers
- [x] ArchivePage: WID displayed in monospace font under track title (always shown if present)
- [x] ArchivePage: track numbers use font-mono tabular-nums for alignment
- [x] ArchivePage: drag handles hidden in batch mode, checkboxes shown instead
- [x] ArchivePage: page header updated to "LNA — Archive"
- [x] Auth guard confirmed: useEffect redirects to login if not authenticated

## Phase 67: Dashboard Sidebar Nav Fix
- [x] Add "Dashboard" nav item to MainLayout sidebar (authenticated only, LayoutDashboard icon)
- [x] Dashboard nav item appears above LNA — Archive in the creator nav section
- [x] Mobile nav overlay also shows Dashboard link

## Phase 69: Genre Pills & Pay Modal Enhancement
- [ ] TrackCard: split genre string into individual pills, own row above actions
- [ ] TrackCard: action buttons always visible (not hidden behind genre blob)
- [ ] MobilePlayerPanel: genre pills in now-playing info sheet
- [ ] TipModal: add genre pills to track info block
- [ ] PlayerTipModal: add genre pills to track info block

## Phase 69: Genre Pills & Pay Modal Enhancement
- [ ] TrackCard: split genre string into individual pills, own row above actions
- [ ] TrackCard: action buttons always visible (not hidden behind genre blob)
- [ ] MobilePlayerPanel: genre pills in now-playing info sheet
- [ ] TipModal: add genre pills to track info block
- [ ] PlayerTipModal: add genre pills to track info block

## Phase 69: Track Card Genre & Tip Modal Enhancement
- [ ] TrackCard: split genre string into pills, max 3 visible + overflow badge, own row above actions
- [ ] ExplorePage inline card: same genre pill treatment
- [ ] TipModal: show genre pills + WID badge in artist info block
- [ ] PlayerTipModal: show genre pills + WID badge in header
- [ ] Actions row never contested by genre overflow

## Phase 70: Lyrics WID (WID-LYR) Feature
- [x] Add lyricsWid, lyricsFileName, lyricsFileHash, lyricsAddedAt columns to songs schema
- [x] Push DB migration (pnpm db:push)
- [x] Add updateSongLyricsWithWid helper to db.ts
- [x] Add addLyricsWithWid tRPC procedure to routers.ts
- [x] Add WID-LYR upload UI to EditTrackPanel (file drop zone, SHA-256 hash, witness button, badge)
- [x] Add lyricsWid/lyricsFileName/lyricsAddedAt to verifyWid return value
- [x] Add WID-LYR Field block to VerifyPage

## Phase 71: Audio Version History (Replace Audio)
- [x] Add audioVersions table to drizzle schema (songId, witnessId, audioUrl, fileKey, fileHash, versionNote, replacedAt)
- [x] Push DB migration (pnpm db:push)
- [x] Add archiveAudioVersion, replaceAudioFile, getAudioVersions helpers to db.ts
- [x] Add replaceAudio (protected) and getAudioVersions (protected) tRPC procedures to routers.ts
- [x] Add getAudioVersionsByWid (public) tRPC procedure for VerifyPage
- [x] Add Replace Audio UI section to EditTrackPanel (file drop zone, version note, SHA-256 hash, mutation, version history list)
- [x] Add Audio Version History section to VerifyPage (shows archived WID-MUS proofs with version notes and dates)
- [x] TypeScript: 0 errors | Vitest: 95 tests passing

## Phase 72: Multi-Medium Expansion — Homepage + Explore + Upload
- [x] Update homepage hero badge from "Audio Provenance Platform" to "Creative Provenance Platform"
- [x] Update homepage hero tagline from music-only copy to multi-medium copy
- [x] Update homepage Explore CTA button from "Explore Music" to "Explore Works"
- [x] Add "Witnessed Works by Medium" stat block to WIDTrustLayer (below Witnessed Voices)
- [x] Add contentType enum column to songs schema: audio | lyrics | manuscript | comic
- [x] Push DB migration (pnpm db:push)
- [x] Add contentType filter to getPublicSongs DB helper
- [x] Add contentType param to songs.discover tRPC procedure
- [x] Add content-type tab bar to ExplorePage: Audio · Lyrics · Manuscripts · Comics
- [x] Add content-type selector (4-card picker) before Step 1 on UploadPage
- [x] Add Manuscript upload flow to UploadPage (PDF file drop + title + WID generation)
- [x] Add Comic/Novel upload flow to UploadPage (PDF/image + title + WID generation)
- [x] TypeScript: 0 errors | Vitest: all passing

## Phase 73: Verify Page + Explore Cards + Live Counts + Version Modal
- [x] Update VerifyPage: medium-aware WID badge (WID-MUS/WID-MAN/WID-CMX/WID-LYR) based on contentType
- [x] Update VerifyPage: add work type description block per medium
- [ ] Update ExplorePage ExploreCard: show document/read icon for manuscript/comic instead of play button
- [ ] Update ExplorePage ExploreCard: link manuscript/comic cards to detail page instead of audio player
- [x] Add getCountsByContentType DB helper and tRPC procedure
- [ ] Wire live counts to homepage Witnessed Works by Medium stat block
- [ ] Ensure version/changelog modal trigger is visible on both mobile and desktop nav
- [x] TypeScript: 0 errors | Vitest: all passing

## Phase 75: Global Player — Vertical Volume + Cinematic Expand
- [x] Fix desktop PlayerBar vertical volume slider (appearance-none strips native vertical; add explicit CSS fix)
- [x] Add vertical volume slider to mobile full-screen player (MobilePlayerLayer)
- [x] Add cinematic inline expand mode to desktop PlayerBar (full-bleed artwork + controls overlay)
- [x] TypeScript: 0 errors | Vitest: all passing

## Phase 76: localStorage Optimization + Browser Compatibility
- [x] Build lnxCache TTL utility (setCache/getCache/clearExpired) with Safari/Brave/mobile guards
- [x] Persist volume level to localStorage (survives page reload)
- [x] Persist sidebar open/collapsed state to localStorage
- [x] Persist last active Explore content-type tab to localStorage
- [x] Add WID Witness Cache Layer (offline proof memory, 24h TTL)
- [x] Add lightweight explore results cache (5-15 min TTL, max 20 items, slim payload)
- [x] Add creator profile cache (1h TTL, basic info only)
- [x] TypeScript: 0 errors | Vitest: all passing

## Phase 77: WID Cache Panel + PWA + Cover Art Compression

- [x] Add WID Witness Cache panel to Dashboard (reads lnxCache snapshots, shows WID, title, type, timestamp, verify link)
- [x] Add PWA manifest.json and service worker (sw.js) — already existed (v5) for static asset caching and offline shell
- [x] Register service worker in main.tsx — already registered
- [ ] Add client-side cover art compression to WebP (max 400x400, canvas resize) before S3 upload in UploadPage
- [x] TypeScript: 0 errors | Vitest: all passing

## Phase 77: WID Cache Panel + PWA + Cover Art Compression
- [x] Add WID Witness Cache panel to Dashboard
- [x] Add PWA manifest.json and service worker (sw.js) — already existed (v5)
- [x] Register service worker in main.tsx — already registered
- [x] Add client-side cover art compression to WebP before S3 upload
- [x] TypeScript: 0 errors

## Phase 78: Color Provenance Standardization
- [x] Define semantic color token system in index.css (foundation, gold, green, orange, red, elevation)
- [x] Add Origin Glow CSS utility classes (gold pulse, active glow, hover elevation)
- [ ] Standardize MainLayout sidebar and PlayerBar to token system
- [ ] Standardize HomePage and ManifestoPage to token system
- [ ] Standardize ExplorePage and VerifyPage to token system
- [ ] Standardize DashboardPage and ArchivePage to token system
- [ ] Standardize UploadPage and modals to token system
- [x] TypeScript: 0 errors | Visual: consistent across all pages

## Phase 78: Color Provenance Standardization
- [x] Define semantic color token system in index.css
- [x] Add Origin Glow CSS utility classes
- [x] Standardize all major components to token system
- [x] TypeScript: 0 errors

## Phase 79: LN Command Center (Admin System)
- [x] Add admin_logs table to schema
- [x] Add system_config table to schema
- [x] Add isFlagged, flagReason, moderationStatus columns to songs table
- [x] Add stripeSubscriptionId column to users table
- [x] Push DB migration
- [x] Add admin procedures: Works/WIDs search, flag, unflag, unpublish
- [x] Add admin procedures: system_config get/set
- [x] Add admin procedures: Stripe billing reset
- [x] Add admin procedures: logAdminAction helper
- [x] Add Works/WIDs tab to AdminUsersPage
- [x] Add Moderation Queue tab to AdminUsersPage (merged into Works/WIDs tab)
- [x] Add System Control tab to AdminUsersPage
- [x] Add Stripe Billing Reset tab (standalone Billing Reset tab)
- [x] Add Admin Logs tab to AdminUsersPage
- [x] Rebrand to LN Command Center
- [x] Wire admin action logging to all mutations
- [x] TypeScript: 0 errors
- [x] Vitest: 108 tests passing (13 new Command Center tests)

## Phase 80: Trust Layer Integration
- [ ] Add playEvents table to schema (songId, witnessId, sessionId, durationSeconds, completed, ipHash, userId)
- [ ] Push DB migration for playEvents
- [ ] Add recordPlayEvent db helper with 30s threshold + session dedup
- [ ] Replace songs.play procedure with songs.recordPlay (sessionId, elapsed, witnessId)
- [ ] Update PlayerContext to send play events with elapsed time + session ID
- [ ] Add upload pipeline: document page-count extraction (PDF/DOCX)
- [ ] Add upload pipeline: comic preview thumbnail generation
- [ ] Add shared UploadMetadata type normalized across all 4 content types
- [ ] Build WitnessFlowStepper component (4 steps: Identity → Work → Contribution → Certificate)
- [ ] Wire WitnessFlowStepper into UploadPage post-witness step
- [ ] Wire plays to WID (playEvents.witnessId references songs.witnessId)
- [ ] Wire certificates to share pages (certificate download links to /share/:wid)
- [ ] Add play audit stats to Dashboard (plays with threshold met vs raw)
- [x] TypeScript: 0 errors
- [x] Vitest: all tests passing

## Phase 80: Trust Layer Integration
- [x] Add playEvents table to DB schema (songId, witnessId, sessionId, userId, durationSeconds, completed, ipHash)
- [x] Push DB migration for playEvents table
- [x] Add MIN_PLAY_SECONDS = 30 constant to db.ts
- [x] Add recordPlayEvent helper with 30s threshold, 80% completion detection, session deduplication
- [x] Add getPlayAuditStats helper (total, completions, avgDuration)
- [x] Add songs.recordPlay tRPC procedure (replaces fire-and-forget play mutation)
- [x] Add songs.playAuditStats tRPC procedure
- [x] Update PlayerContext to generate session IDs, track elapsed time, and call recordPlay with duration
- [x] Create uploadPipeline.ts with UploadMetadata interface, sha256Hex, extractAudioMetadata, extractPdfMetadata, extractDocumentMetadata, extractComicMetadata, runUploadPipeline
- [x] Install pdfjs-dist for PDF preview generation
- [x] Add durationSeconds, sampleRate, bitDepth to songs.upload tRPC input schema
- [x] Add sampleRate, bitDepth to createSong db.ts function signature
- [x] Integrate runUploadPipeline into UploadPage handleGenerateWid (audio path)
- [x] Wire pipelineMeta (durationSeconds, sampleRate, bitDepth) into upload mutation
- [x] Create WitnessFlowPage with 4-step stepper: Identity → Work → Contribution → Certificate
- [x] Register /witness-flow/:witnessId and /witness-flow/song/:songId routes in App.tsx
- [x] Add Witness Flow button to WIDPanel action buttons (links to /witness-flow/:witnessId)
- [x] Write 15 trust layer tests (trust.layer.test.ts)
- [x] All 123 tests passing across 13 test files, TypeScript: 0 errors

## Phase 81: Witness Testimony System + Homepage Refactor
- [x] witnessTestimonies DB table (id, wid, creatorId, content, linkedWorks, createdAt)
- [x] DB migration pushed (TiDB JSON default fix applied)
- [x] testimony.create tRPC procedure (immutable, WID-TST prefix)
- [x] testimony.getByCreator tRPC procedure (public)
- [x] testimony.getByWid tRPC procedure (public)
- [x] testimony.count tRPC procedure (public)
- [x] testimony.mine tRPC procedure (protected)
- [x] verifyWid procedure updated to handle WID-TST lookups
- [x] Testimony tab added to ProfilePage (my testimonies + add flow)
- [x] Testimony section added to CreatorProfilePage (public view)
- [x] WorkCarousel shared component (audio/lyrics/manuscript/comic)
- [x] Creation Type Overview block on homepage (Music/Lyrics/Manuscripts/Comics with counts)
- [x] Witnessed Voices section (WorkCarousel type=audio)
- [x] Witnessed Manuscripts section (WorkCarousel type=manuscript)
- [x] Witnessed Lyrics section (WorkCarousel type=lyrics)
- [x] Witnessed Comics section (WorkCarousel type=comic)
- [x] Extended Genre section (WID-MUS, WID-LYR, WID-MAN categories)
- [x] Discover Works block (manuscripts + comics rows)
- [x] Creators section updated to horizontal scroll with snap
- [x] Admin nav link (LN Command) added to sidebar — role-gated (admin only)
- [x] TypeScript: 0 errors
- [x] Vitest: 123 tests passing (13 test files)

## Phase 82: Batch Upload Mechanics
- [x] Per-track upload cards — each with own audio drop zone, cover art, title, genre, AI consent
- [x] Individual WID generation per card (SHA-256 + ECDSA, shown inline on card)
- [x] Cover art per track — falls back to album art if not set
- [x] Global drag-and-drop — drop multiple audio files anywhere to auto-fill cards
- [x] Add Track button — add one card at a time with + button
- [x] Remove card — X button on each card header (disabled when only 1 card)
- [x] Collapse/expand each card — click header to toggle
- [x] Batch Fill panel — set genre + AI consent once, apply to all cards at once
- [x] Album/collection info panel — shared name + album cover art
- [x] Sticky submit bar — shows ready count, collection name, Witness button
- [x] Per-track S3 upload — each track's audio and cover uploaded separately
- [x] Collection result screen — shows Collection WID, collective hash, track count
- [x] TypeScript: 0 errors
- [x] Vitest: 123 tests passing

## Phase 82b: Batch Upload Page Readability Fix
- [x] Increase contrast on all muted text, labels, placeholders on BatchUploadPage
- [x] Fix "Collection / Album" section label, helper text, input placeholders
- [x] Fix "Batch Fill" description text
- [x] Fix "Tracks — 1 Card" section label
- [x] Fix track card: "Untitled Track" placeholder, "Drop audio", "Cover Art" label, "Falls back to album art" hint
- [x] Fix "Track title" input placeholder text
- [x] Fix Genre dropdown placeholder
- [x] Fix sticky bar secondary text

## Phase 83: LNA Inline Track Management
- [x] Add download permission toggle (none/free/tipped) inline on each track row in ArchivePage
- [x] Add updateDownloadPermission mutation with optimistic update in ArchivePage
- [x] Show current download permission as inline button (No DL / Free DL / Tip DL) per track
- [x] Clicking download button cycles through none → free → tipped → none
- [x] TypeScript: 0 errors
- [x] Vitest: 123 tests passing (13 test files)

## Phase 84: Redeem Bug Fix + Living Archive Subscription
- [ ] Fix backend: redeemPromoCode should ADD slots to existing total, not overwrite
- [ ] Fix frontend: remove "Already Licensed" gate that blocks licensed users from redeeming
- [ ] Add promo code type field (license / slot_pack / discount) to distinguish code types
- [ ] Design Living Archive subscription model ($4.99/mo, unlimited slots beyond 100)
- [ ] Add livingArchiveSubscription field to users table (stripe sub ID)
- [ ] Add Stripe product/price for Living Archive subscription
- [ ] Add subscription checkout + webhook handler
- [ ] Add slot enforcement: warn at 90%, block at 100% with upgrade prompt
- [ ] Add Living Archive upgrade prompt on upload page when near/at slot limit
- [ ] Add billing management page showing current plan + slot usage
- [x] TypeScript: 0 errors
- [x] Vitest: all tests passing

## Phase 84: Living Archive Subscription + Redeem Bug Fix
- [x] Fix redeemPromoCode — ADD slots to existing total instead of overwriting
- [x] Remove "Already Licensed" frontend gate that blocked licensed users from redeeming
- [x] Add licensed status banner to RedeemPage showing current slot count
- [x] Update success message to show slot top-up vs new license messaging
- [x] Add livingArchivePlan, livingArchiveExpiresAt, livingArchiveActive, stripeSubscriptionId fields to users table
- [x] DB migration applied
- [x] Create livingArchiveProducts.ts with quarterly ($12.99) and annual ($44.99) Stripe products
- [x] Add Living Archive DB helpers (activateLivingArchive, deactivateLivingArchive, grantFounderFreeTier)
- [x] Add Stripe webhook handlers for subscription.created, subscription.updated, subscription.deleted
- [x] Add livingArchive tRPC router with checkout, status, cancel, grantFounderFree procedures
- [x] Add slot consumption check to replaceAudio procedure (audio swaps consume a slot)
- [x] Create LivingArchiveBillingPage with quarterly/annual plan cards, slot counter, upgrade prompts
- [x] Add /settings/billing route to App.tsx
- [x] Add slot usage bar to ArchivePage header (links to billing, shows 90%/100% warnings)
- [x] Add Founder Free Tier grant section to BillingResetTab in LN Command Center
- [x] TypeScript: 0 errors
- [x] Vitest: 123 tests passing (13 test files)

## Phase 85: Signal Reply Flow
- [x] Audit Signals tab and comment/reply tRPC procedures
- [x] Add inline reply UI to each signal notification on the Signals tab
- [x] Reply textarea expands on click, collapses after submit
- [x] Reply posts to the same song comment thread
- [x] Success toast after reply submitted
- [x] TypeScript: 0 errors
- [x] Vitest: all tests passing
## Phase 86: Signal Track Card
- [x] Extend notifications.list to include song metadata (title, artist, coverUrl, slug/id) for comment signals
- [x] Add inline track card to each comment signal showing cover art, title, artist
- [x] Play button on track card loads song into global player
- [x] Track title/cover links to /song/:id page
- [x] TypeScript: 0 errors
- [x] Vitest: all tests passing
## Phase 87: Signal Track Card — Now Playing Indicator
- [x] Read currentTrackId and state.isPlaying from usePlayer in ProfilePage
- [x] Signal track card play button swaps to animated gold waveform when song is active + playing
- [x] Signal track card shows paused waveform (frozen bars) when song is active but paused
- [x] Button background/border shifts from violet to gold-tinted when active
- [x] TypeScript: 0 errors
- [x] Vitest: 123/123 passing (13 test files)

## Batch 1 — Fix What's Broken
- [x] Works Witnessed Counter — real DB counts (Published + isPublic only)
- [x] Homepage Discover Tracks — confirmed rendering correctly (226 tracks)
- [x] Remove Facebook Pixel — zero references found, codebase clean

## Batch 2 — Expand What's Working
- [x] Homepage Medium Sections — WorkCarousel for Music, Lyrics, Manuscripts, Comics
- [x] Lyrics UX Mobile Fix — moved to bottom, collapsed by default, expand/collapse toggle
- [x] Media Player Controls — play/pause moved inside cover art as hover overlay
- [x] Expandable Lyrics + Comments — WID-linked badge on Activity header, full-width lyrics panel at bottom

## Audit Fixes (Post Batch 1+2)
- [x] Confirmed Facebook pixel 1383830073227216 absent from all source files
- [x] OG URL confirmed using CANONICAL_ORIGIN (livingnexus.org) correctly
- [x] QuickRefSlider confirmed returning 12 tracks on dev server — production staleness only
- [x] Fixed nested <a> inside <Link> in ManifestoPage (hydration error)
- [x] Fixed getCountsByContentType to only count Published + isPublic works

## Canonical Player — Unified Player UI
- [ ] Add WID provenance panel (expandable) to MobilePlayerLayer expanded state
- [ ] Add signal/reactions display with emoji breakdown to expanded state
- [ ] Add comments panel (WID-bound, expandable) to expanded state
- [ ] Add "Take to Room" action button to expanded state
- [ ] Make creator name clickable → /creator/:id in expanded state
- [ ] Show witnessId WID badge even when no videoWitnessId (use track.witnessId)
- [ ] Add desktop/web modal adaptation (TheaterPlayer uses same canonical structure)
- [ ] TypeScript: 0 errors
- [ ] Vitest: all tests passing

## Canonical Player — Unified UI (Build Order)
- [x] MobilePlayerLayer v2.0 — WID provenance panel (expandable, shows full WID hash + verify link)
- [x] MobilePlayerLayer v2.0 — Signal/reactions display with emoji breakdown (6 reactions)
- [x] MobilePlayerLayer v2.0 — Comments panel (WID-bound, expandable, inline input)
- [x] MobilePlayerLayer v2.0 — "Take to Room" action button (navigates to /together)
- [x] MobilePlayerLayer v2.0 — Cinematic mode WID badge
- [x] TheaterPlayer — Signals tab added (3-tab: Lyrics / Signals / Comments)
- [x] TheaterPlayer — WID provenance panel (overlay on artwork, toggle via WID badge)
- [x] TheaterPlayer — Reactions/signals grid with emoji breakdown and user state
- [x] TheaterPlayer — "Take to Room" button in controls area
- [x] TheaterPlayer — widBadge unified (audio WID + video WID fallback)

## Founder System + Micro Video Engine (Apr 4, 2026)
- [x] Schema migration: founder role enum, slotLimit on users, autoVideoUrl/Key on songs
- [x] DB helpers: grantFounder, revokeFounder, listFounders, countFounders, searchUsersForFounderPanel, MAX_FOUNDERS
- [x] Slot enforcement: founders (slotLimit=null) bypass all slot checks in upload, batch upload, and audio replacement
- [x] Admin tRPC: grantFounderRole, revokeFounderRole, getFounders, searchUsersForFounder
- [x] Admin UI: Founder Control tab (capacity bar, current founders list, grant/revoke by search)
- [x] DB helpers: getSongsNeedingAutoVideo (founder-priority sort), cacheAutoVideoUrl, getAutoVideoStats
- [x] Admin tRPC: autoVideoStats, generateAutoVideos (founder-priority queue, fire-and-forget)
- [x] Admin UI: Media Generation tab (stats, batch limit input, progress log, founder priority badge)
- [x] All 123 tests passing

## Automatic Visual Generation Pipeline
- [x] Schema: add visualQueue table (pending/processing/complete/failed) + visualReady flag on songs
- [x] Visual queue engine (server/visualQueue.ts): enqueueVisualJob, startVisualWorker, backfillVisualQueue
- [x] Auto-trigger: enqueue on song creation (upload), batch upload, and publish event
- [x] Background worker: processes 2 jobs/tick every 15s, founder-priority (priority=10), sets visualReady=true on completion
- [x] Server startup: worker starts automatically, backfills all songs missing visuals
- [x] Admin tRPC procedures: visualPipelineStats, visualQueueJobs, requeueFailedVisuals, enqueueVisualForSong
- [x] Admin Media Generation tab: replaced manual trigger with live pipeline status dashboard
- [x] Pipeline dashboard: stats grid, completion progress bar, requeue failed, enqueue by ID, live job table

## Visual Pipeline Improvements (Apr 4)
- [x] visualReady gate: shimmer "generating visual…" overlay in MobilePlayerLayer
- [x] visualReady gate: shimmer "generating visual…" overlay in TheaterPlayer
- [x] Worker throughput: BATCH_SIZE increased from 2 → 5 per tick
- [x] Failed job alerting: notifyOwner fires when a job exhausts MAX_ATTEMPTS (3)

## Follow-up Improvements (Apr 4 — batch 2)
- [ ] Auto-refresh visualReady in player: poll every 30s while shimmer active, fade in video on ready
- [ ] Founder crown badge on creator profile pages and song cards
- [ ] Worker interval: reduce from 15s to 10s

## Visual Pipeline Improvements (Follow-up)
- [x] Auto-refresh visualReady in player: poll getById every 30s while pending, patchTrack on flip
- [x] Founder crown badge on TrackCard and CreatorProfilePage
- [x] creatorRole propagated through all 12 track-mapping sites + getPublicSongs DB query
- [x] Worker interval reduced from 15s to 10s in visualQueue.ts

## Visual Queue Notification Fix
- [x] Skip ineligible songs (no coverArtUrl or fileUrl) silently at enqueue AND worker level
- [x] Deduplicate owner notifications — only fire once per job lifetime (shouldNotify guard)
- [x] Backfill query now filters out ineligible songs before enqueuing

## Visual Pipeline — Follow-up Round 2
- [ ] Bulk-requeue failed jobs button in admin Media Generation tab
- [ ] Cover art required validation on upload flow (client-side block)
- [ ] Daily midnight digest replacing per-failure notifyOwner

## Visual Pipeline — Three Improvements (Apr 4)
- [x] Bulk-requeue failed jobs button (already existed in admin panel — confirmed)
- [x] Cover art required validation on upload flow (client-side block for audio uploads)
- [x] Daily midnight digest replacing per-failure notifyOwner

## Player & TrackCard Improvements (Apr 4 — Round 2)
- [ ] Founder crown badge in MobilePlayerLayer creator name during playback
- [ ] Founder crown badge in TheaterPlayer creator name during playback
- [ ] visualReady shimmer on TrackCard cover art thumbnails
- [x] Witness Activity strip: live listener count polling endpoint
- [x] Witness Activity strip: player UI above comments panel

## Bug Fix: WID Badges Not Rendering on TrackCards
- [x] Diagnose why WID (Witness ID) badges are missing on TrackCards in Discover/Explore carousels
- [x] Fix WID badge rendering in TrackCard and/or data mapping sites

## UX Sprint: Player, Interactions, Profiles, Prompt Generator, Tribute

### MoshAIMusic Tribute (Community Inspiration)
- [x] Add tribute/inspiration state at homepage bottom honoring MoshAIMusic (Slimdoggy on Discord)
- [x] Quote his Discord comment about lyric sheet → instrumentation cue → timing map workflow
- [x] Include his real avatar, handle, and link to his profile (/creator/780095)

### Testimony Pill on Creator Profile
- [x] Show a "WITNESSED" testimony pill/badge on creator profile when they have uploaded works
- [x] Pill shows WID count (both desktop and mobile stats rows)

### AI Music Prompt Generator (Creator Profile Tab)
- [x] Add "Prompt Studio" button to creator profile page (desktop + mobile, owner only)
- [x] Pop-up/modal with LLM-powered prompt generator for music AI tools (Suno/Udio/General)
- [x] Inputs: lyrics or theme, genre, mood, instrumentation, target platform
- [x] Output: full prompt text, style tags, title suggestions, composer note
- [x] Copy-to-clipboard for prompt, style tags, and each title suggestion
- [x] Backend tRPC promptStudio.generate procedure using LLM

### Global Player UX Polish
- [x] Mini player artist name color improved (more visible on dark bg)
- [x] Signals section label upgraded with divider line (mobile + theater)
- [x] TheaterPlayer artist name color improved for readability

### Interaction Layer Polish
- [x] Signals label divider line added for visual hierarchy
- [ ] Signal burst micro-animation on emoji reaction tap (deferred)

## Share Preparation Pipeline (Static OG Artifacts) — COMPLETE
- [x] Add share_artifacts table to drizzle schema (wid PK, title, creatorName, imageUrl, shareUrl, htmlSnapshot, oembedJson, status enum, timestamps)
- [x] Push DB migration (pnpm db:push) — shareArtifacts table live
- [x] Create server/services/shareArtifactService.ts with generateShareArtifact(wid) function
- [x] Wire generateShareArtifact call in songs.upload tRPC procedure (fire-and-forget after publish)
- [x] Add admin.regenerateShareArtifact tRPC mutation for manual reruns
- [x] Upgrade GET /share/:wid Express route with fast-path cache lookup from share_artifacts
- [x] GET /api/oembed Express route already live (checks share_artifacts first)
- [x] Homepage OG URL already correct — og:url set to https://www.livingnexus.org/
- [x] Write backfill script: server/scripts/backfillShareArtifacts.mjs
- [x] Run backfill script — 222 published WIDs processed successfully (Success: 222 | Failed: 0)
- [ ] Verify: paste a /share/WID URL into Discord and confirm correct title/image/creator renders (manual step)

## Attribution Correction: Prompt Studio Inventor Credit
- [x] Update homepage MoshAIMusic section: remove testimonial/fan framing, replace with factual inventor attribution for Prompt Studio workflow architecture
- [x] Remove fabricated/paraphrased quote block (blockquote element removed entirely)
- [x] Display copy: "Prompt Studio — workflow architecture" label + "WORKFLOW ARCHITECT" badge + descriptive attribution sentence
- [x] Kept avatar, handle, and /creator/780095 link
- [x] Footer line changed to "Workflow attribution recorded on Living Nexus"

## Feature Sprint: Attribution DB + Share URL + Prompt Register
- [x] Add featureAttributions table to drizzle schema (featureName, attributedTo, userId, description, recordedAt)
- [x] Push DB migration (migration applied) and seed MoshAIMusic Prompt Studio attribution record (ID 1, 2026-04-04)
- [x] MobilePlayerLayer share button already uses /share/{witnessId} URL (confirmed)
- [x] Add share button to TheaterPlayer controls row (Share2 icon, copies /share/{witnessId})
- [x] Add "Register this Prompt as a Work" button to Prompt Studio modal output section
- [x] Button navigates to /upload?title=&genre=&mood=&tags= with pre-filled values from generated output
- [x] UploadPage reads query params on mount and pre-fills title, genre, selectedMoods, caption fields
- [x] URL cleaned after pre-fill (window.history.replaceState) so refresh doesn't re-apply

## Founders Flow: List Page + Era Support Page + Homepage Entry
- [x] Audit existing founders data (creatorRole='founder' in users table), routes, and homepage
- [x] Build /founders page: Founding Creators list with avatar, handle, WID count, linked profile, gold rank badges
- [x] /founders page: attribution section explaining Founder Era significance + CTA to /founder-era
- [x] Build /founder-era page: FounderEraPage.tsx (gift tiers, Stripe checkout, supporters wall)
- [x] Add Founder Era section/entry point to homepage (two CTAs: View Founding Creators + Support the Era)
- [x] Wire navigation: sidebar nav (desktop + mobile) — Founding Creators (Star) + Founder Era Support (Heart)
- [x] Register /founders and /founder-era routes in App.tsx
- [x] Add public supporters.getFoundingCreators tRPC procedure (returns creatorRole='founder' users with WID counts)

## Homepage Improvements (Apr 2026)
- [x] Add "Why Work With Us / Competitors" comparison section to homepage
- [x] Fix MoshAIMusic attribution tag: remove last name, show only "Brandon" (not "Brandon Reedy")
- [x] Add Prompt Studio entry point / CTA section on homepage so feature is discoverable

## Prompt Studio Visibility Fix (Apr 2026)
- [x] Move Prompt Studio button outside isOwner gate — visible to ALL visitors on every creator profile page

## Prompt Studio Redesign — Auto-Generate + EID (Apr 2026)
- [ ] Add expressionId (EID) column to users table and migrate
- [ ] Add promptStudio.generateFromProfile tRPC procedure (auto-reads profile metadata, calls LLM, returns prompt + EID)
- [ ] Add promptStudio.getProfilePrompt tRPC procedure (returns saved EID + prompt for a creator)
- [ ] Rebuild Prompt Studio modal: auto-generate on open from profile metadata, no manual upload step
- [ ] Display EID badge on creator profile page (like WID badge on songs)
- [ ] Show generated prompt text + EID in modal with copy/regenerate buttons

## Provenance Prompt Generator v2 + Navigation (Apr 4 2026)
- [ ] Add expressionLineage table to schema (EID history archive)
- [ ] Add tone/frequency fields to users table (toneFrequencyNote, dominantKey, tempoRange, energyProfile)
- [ ] Backend: generateFromProfile pulls creator's own lyrics from registered songs
- [ ] Backend: generateFromProfile uses tone/frequency metadata in LLM prompt
- [ ] Backend: save EID lineage record on every generation
- [ ] Backend: getLineageHistory procedure (public, returns all past EIDs)
- [ ] UI: EID badge on public creator profile header (always visible)
- [ ] UI: Lineage history tab in Provenance Prompt Generator modal
- [ ] UI: Add "My Profile" nav link to sidebar
- [ ] UI: Sidebar collapse toggle button (left sidebar collapsible)

## Mobile Player Scroll Fix (Apr 4 2026)
- [x] Fix mobile expanded player panel scroll — ORIGIN PROOF / WID section content not scrollable

## Provenance Prompt Generator — Multi-Type Dropdown (Apr 4 2026)
- [x] Add promptType dropdown to generator modal (Style Prompt, Lyric Brief, Composer Blueprint, Visual Direction, Press Bio)
- [x] Backend: promptType parameter on generateFromProfile, each type has own LLM system prompt
- [x] UI: update result display per type (labels, copy buttons, output sections)

## Provenance Prompt Generator v3 (Apr 4 2026)
- [ ] DB: add promptMode (identity_regen | style_prompt) and userInputBlocks fields to expressionLineage table
- [ ] Backend: add generateStylePrompt procedure with user input blocks + profile fusion
- [ ] Backend: update archive to store both identity_regen and style_prompt entries
- [ ] UI: rebuild modal as 3-tab tool (Identity Regen / Style Prompt Studio / Archive)
- [ ] UI: Style Prompt Studio tab has free-form input blocks (lyrics, style ideas, mood, etc.)
- [ ] UI: Archive tab shows unified history of both modes with mode badge

## Provenance Prompt Generator v3 + Sidebar (Apr 4 2026)
- [ ] Add Provenance Prompt Generator nav link under My Profile in sidebar
- [ ] Add promptDrafts table to schema for saving named Studio outputs
- [ ] Add saveDraft/getDrafts/deleteDraft tRPC procedures
- [ ] Add sharePrompt procedure (returns public share URL tied to EID)
- [ ] Add tone/frequency editor to Profile Settings page
- [ ] Add updateToneFrequency tRPC procedure
- [ ] Add Save as Draft button to Studio tab result
- [ ] Add Share button to Studio tab result
- [ ] Show saved drafts list in Studio tab

## Provenance Prompt Generator v3 + Sidebar (Apr 4 2026)
- [ ] Add Provenance Prompt Generator nav link under My Profile in sidebar
- [ ] Add promptDrafts table to schema for saving named Studio outputs
- [ ] Add saveDraft/getDrafts/deleteDraft tRPC procedures
- [ ] Add sharePrompt procedure (returns public share URL tied to EID)
- [ ] Add tone/frequency editor to Profile Settings page
- [ ] Add updateToneFrequency tRPC procedure
- [ ] Add Save as Draft button to Studio tab result
- [ ] Add Share button to Studio tab result
- [ ] Show saved drafts list in Studio tab

## Three Feature Build (Apr 4 2026)
- [x] Add CREATOR TOOLS section header to mobile nav in MainLayout
- [x] Add Saved Drafts panel to Archive tab in Provenance Prompt Generator modal
- [ ] Build public /prompt/:token shared prompt landing page
- [ ] Register /prompt/:token route in App.tsx

## PPG Import & Anchor Tab (Apr 4 2026)
- [ ] Add anchorExternalPrompt procedure to promptStudio router
- [ ] Add importMode and sourcePlatform fields to expressionLineage schema
- [ ] Add Import & Anchor as 4th tab in PPG modal
- [ ] Paste input area for raw external style prompt
- [ ] Source platform selector (Suno, Udio, Udio v2, Stable Audio, General)
- [ ] LLM fusion: blend external prompt with creator EID + profile lineage
- [ ] Store anchored result in expressionLineage archive with IMPORT badge
- [ ] Copy-ready output tied to creator EID
- [ ] Add anchorExternalPrompt procedure to promptStudio router
- [ ] Add Import & Anchor 4th tab to PPG modal with paste input, platform selector, EID fusion, archive storage

## PPG Import & Anchor Tab — COMPLETED (Apr 4 2026)
- [x] Add anchorExternalPrompt procedure to promptStudio router
- [x] Add sourcePlatform and rawExternalPrompt fields to expressionLineage schema
- [x] Add sourcePlatform and rawExternalPrompt fields to promptDrafts schema
- [x] Extend saveDraft promptMode enum to include import_anchor
- [x] Add Import & Anchor as 4th tab in PPG modal
- [x] Paste input area for raw external style prompt with char counter and clear button
- [x] Source platform selector (Suno, Udio, Udio v2, Stable Audio, General)
- [x] Target platform selector (Suno, Udio, General)
- [x] LLM fusion: blend external prompt with creator EID + profile lineage
- [x] Store anchored result in expressionLineage archive (promptMode=import_anchor)
- [x] Display anchored prompt, style tags, composer note, fusion note
- [x] Copy Full Output button
- [x] Save Draft and Share buttons on result
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Desktop Layout Migration — Top Bar + Live Panel (Apr 5 2026)
- [x] Build TopBar.tsx: slim fixed top bar with logo, 6 core nav pills, Prompt Gen button, Register Work gold button, avatar, hamburger
- [x] Build NavDrawer.tsx: full-width collapsible drawer with 5 sections (Navigate/Create/Discover/Account/Platform) + user card
- [x] Build LiveActivityPanel.tsx: left-edge slide-in panel with Now Playing / Tips / Sessions tabs
- [x] Update MainLayout.tsx: use TopBar on desktop (lg+), keep existing mobile sidebar/bottom nav unchanged
- [x] Remove marquee banner (replace with LiveActivityPanel)
- [x] Extend bottom player bar to full-width on desktop (remove left sidebar offset)
- [x] Adjust main content area top padding for topbar height on desktop
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Live Activity Panel — Sessions Tab Fix (Apr 5 2026)
- [x] Added `listActiveJukeboxRooms` DB helper (distinct room codes with pending queue items in last 2h)
- [x] Added `jukebox.listActiveRooms` tRPC public procedure
- [x] Wired LiveActivityPanel Sessions tab to real `trpc.jukebox.listActiveRooms` query (polls every 15s)
- [x] Shows room card: cover art, room code badge, now-playing title/artist, queued track count, host name
- [x] Clicking a room card navigates to /together?room=CODE
- [x] TypeScript: 0 errors | Tests: 121/123 passing (2 pre-existing mock failures in trust.layer.test.ts)

## Pricing Overhaul — One-Time Payments Only (Apr 5 2026)
- [x] Remove all monthly/subscription tiers from livingArchiveProducts.ts
- [x] Founder tier: $88.88 one-time (dynamic: $288.88 after 10 founders claimed) — purchaseFounder procedure
- [x] License tier: $88.88 one-time, 100 slots included — purchaseLicenseOneTime procedure
- [x] Slot packages (bulk): 100/300/500 slots — purchaseSlotPackage procedure
- [x] Micro packages: 10/30/50 slots — purchaseSlotPackage procedure
- [x] All Stripe checkout procedures use mode: "payment" (not subscription)
- [x] FoundersPage: shows current price, "price increases after 10 founders" note, gold CTA button
- [x] LivingArchiveBillingPage: full Slot Store with micro + bulk package cards
- [x] DashboardPage: slot purchase shows 6 package buttons (micro + bulk)
- [x] PricingCovenantPage: uses purchaseLicenseOneTime, no subscription references
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Cosmic Visual Improvements — Medium Icons (Apr 5 2026)
- [ ] Replace generic emoji/lucide icons on homepage Witnessed Works section with custom cosmic SVG glyphs
- [ ] Add ambient glow halos and particle dust treatment to each medium card
- [ ] Apply same cosmic icon treatment to upload medium selector (Step 1 of upload flow)
- [ ] Ensure consistent visual language: Music (sound wave/nebula), Lyrics (quill/starfield), Manuscripts (scroll/constellation), Comics (panel/galaxy burst)

## Content Moderation System — Living Nexus Doctrine (Apr 5 2026)
- [ ] Add contentFlags table to drizzle schema (workId, workType, reporterId, reason, status, adminNote, resolvedAt)
- [ ] Add flagWork / listFlags / resolveFlag DB helpers to server/db.ts
- [ ] Add moderation.flagWork (public protected) and moderation.listFlags / moderation.resolveFlag (admin) tRPC procedures
- [ ] Add Flag button to song detail page, post detail page, and creator profile
- [ ] Build Admin → Moderation tab with queue, filter by status, action buttons (approve/warn/remove/ban)
- [ ] Add songs.status = "removed_violation" handling — work removed from public view, WID preserved
- [ ] Doctrine text embedded in admin panel and flag report flow

## Signable Creator Declaration (Apr 5 2026)
- [ ] Add declarationSignatures table (userId, declarationVersion, signedAt, signatureName, ipHash)
- [ ] Add declaration.sign tRPC procedure (protected, stores signature)
- [ ] Add declaration.hasUserSigned query (returns version signed + date)
- [ ] Build signing modal: shown before first WID registration, creator types their name to sign
- [ ] Declaration text versioned in shared/declaration.ts (v1 initial text)
- [ ] Profile badge: "Covenant Signed [date]" shown on creator profiles
- [ ] /manifesto page: show current Declaration text + live count of signatories
- [ ] Notify creators when Declaration version updates (re-affirm flow)

## Phase: Moderation & Declaration System Completion (Apr 2026)
- [x] Fix TypeScript error in ModerationQueuePage (GREEN/RED constants at module scope in AdminUsersPage.tsx)
- [x] Moderation Queue route already registered at /admin/moderation in App.tsx
- [x] ModerationQueueEmbed already wired as "Covenant Moderation" tab in AdminUsersPage
- [x] FlagContentButton wired into SongDetailPage action buttons (non-owner only)
- [x] Added declaration.creatorStatus public tRPC procedure to query creator's declaration status
- [x] CovenantBadge wired into CreatorProfilePage profile header (shows if creator has signed)
- [x] Owner CTA added to CreatorProfilePage: "Sign the Living Nexus Declaration →" button for unsigned owners
- [x] DeclarationModal wired into CreatorProfilePage for owner signing flow
- [x] ManifestoPage already has DeclarationCTA with live signer count (was pre-wired)
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Phase: Terms of Service Page (Apr 2026)
- [x] Create TermsPage.tsx with creator-protection preamble as the opening statement
- [x] Register /terms route in App.tsx
- [x] Add Terms link to sidebar/footer navigation (mobile drawer + desktop TopBar drawer)
- [x] Style with Divine Noir aesthetic matching ManifestoPage

## Phase: AI Disclosure Audit & Work Versioning (Apr 2026)

- [x] Create shared AiDisclosurePill component (single source of truth for all AI disclosure badges)
- [x] Update TrackCard to use shared AiDisclosurePill (removed inline AiDisclosureBadge)
- [x] Update ExplorePage to use shared AiDisclosurePill (removed inline AiDisclosureBadge)
- [x] Update MobilePlayerPanel to use shared AiDisclosurePill
- [x] Update DiscoverPage to use shared AiDisclosurePill
- [x] Update EditTrackPanel select option labels: ORIG→Human-Made, AI+→AI-Assisted, AI→AI-Generated
- [x] Update ProfilePage AI disclosure select option labels to new terminology
- [x] Add songVersions table to drizzle/schema.ts (versionNumber, versionLabel, fileUrl, witnessId, changeNote, aiDisclosure, fileSizeBytes)
- [x] Run pnpm db:push to create songVersions table in database
- [x] Add songVersions DB helpers to server/db.ts (createSongVersion, getSongVersions, getLatestVersionNumber, getSongVersionById)
- [x] Add versions tRPC router to routers.ts (list, upload procedures — archives original as v1 on first new upload)
- [x] Build VersionHistoryModal component (version list, upload new version flow, WID per version, doctrine note)
- [x] Wire VersionHistoryModal into SongDetailPage with "Versions" button in action row
- [x] TypeScript: 0 errors | Tests: 123/123 passing

### Phase: Player Queue & Profile Header Fixes (Apr 2026)
- [x] Fix album/collection track queue on CreatorProfilePage — clicking a track in an album now queues only that album's tracks in order
- [x] Fix homepage Witnessed Voices section — clicking a voice card queues the entire Witnessed Voices list in order
- [x] Fix homepage HorizontalTrackGrid sections — each section plays only its own tracks in order via onPlay prop on TrackCard
- [x] Fix homepage TrendingHorizontalGrid — same ordered queue fix applied
- [x] Fix creator profile H1 header — now always shows creator.name (stable display name), never changes on interaction
- [x] Add @handle sub-header below artist name — clickable button that copies the profile URL to clipboard (like Twitter), styled in muted mono font
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Phase: Bug Fixes — Tabs / Volume / Listen Together (Apr 5 2026)
- [ ] Fix duplicate adjacent tabs (identify which page has two tabs side-by-side that shouldn't be there)
- [x] Fix volume control non-functional when player bar is minimized — added volumePopupCompactRef, fixed z-index and positioning
- [x] Fix Listen Together track reset — navigating away and back resets the currently playing track — added currentTrackId guard

## Phase: Tester Bug Reports (Apr 5 2026 — Slimdoggy/MaxSpeed)
- [x] Fix description textarea — auto-grows height as user types (EditTrackPanel Caption + ProfilePage Bio EditableField)
- [x] Fix album end-of-queue — after last track, player stops instead of looping back to track 1 (both onEnded and nextTrack)
- [x] Fix duplicate @handle display in profile edit panel — new HandleField component integrates @ prefix, no duplication when editing
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Phase: Listen Together Room Cards (Apr 5 2026)
- [ ] Fix Sanctuary room cards — show currently-playing track album art instead of placeholder emoji
- [ ] Fix duplicate/empty tabs on the Listen Together page

## Phase (Active Sanctuaries Fix)
- [x] Replace DEMO_ROOMS hardcoded array in TogetherPage lobby with live trpc.jukebox.listActiveRooms query
- [x] Room cards now show real album artwork (nowPlayingCoverArtUrl), track title, artist, room code, queued count
- [x] Loading skeleton shown while fetching; empty state shown when no rooms are active
- [x] joinRoom() and auto-rejoin no longer reference DEMO_ROOMS (removed all demo data dependencies)
- [x] TypeScript: 0 errors | Tests: 123/123 passing

## Atmospheric Lighting Enhancements
- [x] Warm radial vignette / ambient candlelight glow on homepage hero
- [x] Parchment grain texture overlay on track cards and modals
- [x] Amber-to-gold flame gradient on progress bar scrubber

## Gold Banner for 50+ Play Tracks
- [x] Confirm playCount field available in TrackCard props and song list data
- [x] Add gold banner CSS (shimmer border, crown badge) for tracks with 50+ plays
- [x] Apply gold banner to TrackCard component
- [x] Apply gold banner to ArchivePage and ExplorePage song rows

## Discord Webhook Integration
- [x] Add discordWebhooks table to drizzle schema and push migration
- [x] Build server/discord.ts webhook service (store/retrieve, fire, rate limit 30/min, test)
- [x] Add tRPC procedures: getWebhooks, saveWebhook, toggleWebhook, deleteWebhook, testWebhook, notifyRoomOpened
- [x] Wire webhook triggers: WID issuance, track upload, jukebox room, tip, like surge
- [x] Build Discord Integration settings tab in creator dashboard
- [x] Write vitest tests for webhook service (8 tests passing)

## Platform Master Discord Webhook + Creator Chat
- [ ] Add platformSettings table to schema (key/value store for owner config)
- [ ] Add platform master webhook URL to discord.ts fire logic (fires on ALL events for all users)
- [ ] Add admin settings UI for owner to configure master webhook URL + test it
- [ ] Add messages table to schema (senderId, recipientId, content, readAt, timestamps)
- [ ] Add sendMessage, getConversation, getInbox, markRead tRPC procedures
- [ ] Add chat bubble button to creator profile pages (opens slide-in chat panel)
- [ ] Add Messages inbox tab to creator dashboard
- [ ] Real-time polling (every 10s) for new messages with unread badge count
- [ ] Write vitest tests for chat procedures

## Bug Fix: Download Service Unavailable
- [x] Diagnose /api/download/:id returning "Service Unavailable"
- [x] Fix download route: upload ID3-tagged file to S3 and redirect browser directly, bypassing CDN response-body size limit

## Vertical Volume Control Redesign
- [ ] Audit current volume control in PlayerBar (bottom bar, cinematic, theater views)
- [ ] Implement vertical volume slider popup on bottom bar with amber lantern styling
- [ ] Implement unique vertical volume control for cinematic view
- [ ] Implement unique vertical volume control for theater view

## Bug Fix: Missing React key props in LiveActivityPanel
- [x] Fixed tips list using array index i as key — changed to t.id (stable unique identifier)

## Bug Fix: Tip-to-Download Unlock Timeout
- [ ] Diagnose "Download unlock is taking longer than expected" timeout in tip-download flow
- [ ] Fix Stripe webhook handler to correctly mark tip_download as unlocked
- [ ] Fix frontend polling to detect unlock reliably without timing out

## WID Explainer, Popup Updates & Terms of Service
- [x] Audit current homepage WID sections, popup copy, and any existing TOS content
- [x] Expand homepage with dedicated WID Clarity section (what it proves, what it supports, what it does not replace) with copyright.gov link
- [x] Update WID-related popups with disclaimer: WelcomeModal, UploadPage (post-WID generation), LearnPage (after interop table)
- [x] Add Section 2 to Terms of Service: "Witness IDs — Scope and Limitations" with full legal disclaimer language and copyright.gov link; renumbered remaining sections 3–9
- [x] /terms page already live at /terms with route and footer link
- [ ] Add TOS acceptance checkbox to registration / first-login flow

## Bug Fix: Animation Shorthand/Non-Shorthand Conflict on /song/:id
- [x] Found 6 conflict sites across 4 files: LiveActivityPanel (2), MobilePlayerLayer (2), TheaterPlayer (1), CreatorProfilePage (1)
- [x] Replaced all `animation` shorthand + `animationDelay` pairs with separate `animationName`, `animationDuration`, `animationTimingFunction`, `animationIterationCount`, `animationDirection`, `animationDelay` properties
- [x] Removed conflicting `animate-pulse` Tailwind classes where inline animation properties were added
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Feature: Human-Authored via AI Instrument (HAAI) Disclosure System
- [x] Add HAAI declaration columns to songs DB schema: haaiVisualConcept, haaiStyleLanguage, haaiInstrumentation, haaiVocalConveyance, haaiLyricalInspiration, haaiEmotionalTone, haaiDeclaredAt
- [x] Run direct SQL migration (drizzle journal out of sync; columns confirmed live in DB)
- [x] Add HAAI as 4th aiDisclosure option: "human_authored_ai_instrument" (users + songs tables, DB enums updated)
- [x] Build HAAIDeclarationForm component: 6-field structured intent form
- [x] Integrate HAAIDeclarationForm into UploadPage — shown when disclosure = "human_authored_ai_instrument"
- [x] Surface HAAI Authorship Declaration panel on SongDetailPage (collapsible, below WID badge)
- [x] Update AiDisclosurePill: HAAI type, PenLine icon, gold color, directorial tooltip
- [x] Update AI disclosure badge in SongDetailPage, ProfilePage, and all disclosure selectors
- [x] TypeScript: 0 errors | Tests: 131/131 passing
- [ ] Include HAAI fields in WID certificate PDF download
- [ ] Write dedicated vitest tests for HAAI schema and procedures

## Bug Fix: Notification Type Enum Truncation (reactions)
- [x] Audited notifications table enum — had 7 values, missing "reaction"
- [x] Identified routers.ts line 1279 sends type: "reaction" on emoji reaction events
- [x] Added "reaction" to notifications.type enum in drizzle/schema.ts
- [x] Applied ALTER TABLE to live DB — enum now includes reaction
- [x] Data truncated error on reaction events resolved

## Feature: TOS Acceptance Checkbox (First Login / First Upload)
- [x] Add tosAcceptedAt and tosVersion columns to users table in drizzle/schema.ts
- [x] Applied ALTER TABLE to live DB — both columns confirmed
- [x] Added recordTosAcceptance() helper to db.ts
- [x] Added trpc.onboarding.acceptTos mutation (version-stamped, idempotent)
- [x] Built TosAcceptanceModal: scrollable TOS summary, non-dismissible dialog, checkbox, Accept & Continue button
- [x] Modal shows on first login when tosAcceptedAt is null OR tosVersion !== CURRENT_TOS_VERSION (re-prompts on TOS updates)
- [x] Wired into App.tsx before WelcomeModal so TOS is accepted before welcome flow
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Disclosure: Platform Dependency & TOS Limitation Notice
- [x] Added Section 3 to TermsPage: "Platform Infrastructure & Governing Terms" with amber warning callout, 3 paragraphs covering third-party dependency, sovereign migration commitment, and creator guidance; renumbered sections 4–10
- [x] Added Section 3 to TosAcceptanceModal with amber callout: "Current Limitation" notice about host platform TOS precedence
- [x] Updated checkbox label to include platform infrastructure acknowledgment
- [x] Bumped CURRENT_TOS_VERSION to "2.1" — existing users who accepted v2.0 will be re-prompted
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Feature: Platform TOS Comparison Page (/terms/compare)
- [x] Researched platform TOS obfuscation: word counts, Flesch scores, reading times from Visual Capitalist (2020) + Social Media Lab TMU (2024)
- [x] Built /terms/compare page with 3 tabs: Platform Analysis (5 platforms), Legal Lexicon (12 terms), Our Approach (6 commitments)
- [x] Each platform card: word count, reading time, Flesch score, grade level, 4 feature flags, expandable clause cards with raw vs plain-English translation
- [x] Lexicon: 12 terms with severity ratings (CRITICAL/HIGH/MEDIUM), definitions, and real-world examples
- [x] Our Approach tab includes honest platform limitation disclosure
- [x] Wired /terms/compare route in App.tsx (before /terms to avoid route shadowing)
- [x] Added Compare Platform TOS link to /terms page header
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Feature: v2.20.0 WhatsNew Entry + Footer Links + Privacy Policy
- [x] Added v2.20.0 WhatsNew entry: HAAI disclosure, TOS v2.1 platform dependency, /terms/compare page; bumped CURRENT_VERSION
- [x] Added /terms/compare and /privacy to sidebar footer (MainLayout) and mobile drawer (TopBar)
- [x] Built Privacy Policy page at /privacy: 9 sections covering data collection, use, AI training consent, data residency, retention (5 categories), third-party processors (5 processors with policy links), creator data rights (6 rights), cookies, and contact
- [x] Wired /privacy route in App.tsx
- [x] Added Privacy Policy link to /terms page header
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Feature: Sovereign Migration Tracker + Data Export + Data Deletion Request
- [x] Added Sovereign Migration Status tracker to /privacy page: 3-stage roadmap (Hosted → Migrating → Sovereign) with current stage highlighted in amber
- [x] Added trpc.onboarding.exportData query procedure: returns account (no Stripe IDs), songs, witnessTestimonies, haaiDeclarations, songVersionHistory as JSON
- [x] Added ExportDataButton to ProfilePage DATA RIGHTS section: downloads JSON file with date-stamped filename
- [x] Added dataDeletionRequestedAt column to users table in schema.ts and live DB
- [x] Added trpc.onboarding.requestDeletion mutation: sets dataDeletionRequestedAt + notifyOwner with creator details and timestamp
- [x] Added RequestDeletionButton to ProfilePage DATA RIGHTS section: two-step confirm dialog before submitting
- [x] TypeScript: 0 errors | Tests: 131/131 passing
## Feature: Admin Data Rights Tab + Sovereign Migration DB + HAAI Certificate Fields
- [x] Added platformSettings table to drizzle/schema.ts (key/value store for sovereign migration stage and notes)
- [x] Seeded platformSettings with default sovereignMigrationStage=hosted
- [x] Added listDeletionRequests(), markDeletionRequestProcessed(), getPlatformSetting(), setPlatformSetting() helpers to server/db.ts
- [x] Added trpc.admin.listDeletionRequests query: returns all users with dataDeletionRequestedAt set, including name/email/request date/processed status
- [x] Added trpc.admin.markDeletionRequestProcessed mutation: sets dataDeletionProcessedAt on user record
- [x] Added trpc.admin.getSovereignMigrationStatus query: reads stage+notes from platformSettings DB table
- [x] Added trpc.admin.setSovereignMigrationStatus mutation: updates stage+notes in platformSettings DB table
- [x] Added trpc.onboarding.getSovereignMigrationStatus public query: reads stage from DB for /privacy page
- [x] Built DataRightsTab component in AdminUsersPage.tsx: deletion requests table with creator name, email, request date, processed status, and Mark Processed action button
- [x] Built SovereignMigrationAdmin panel in DataRightsTab: dropdown to change stage (Hosted/Migrating/Sovereign) + notes textarea + Save button
- [x] Wired Data Rights tab into AdminUsersPage tab list with Trash2 icon
- [x] Replaced hardcoded migration tracker on /privacy page with live SovereignMigrationTracker component (reads from DB via tRPC)
- [x] Added HAAI fields to WIDPanelProps interface: haaiVisualConcept, haaiStyleLanguage, haaiInstrumentation, haaiVocalConveyance, haaiLyricalInspiration, haaiEmotionalTone, haaiDeclaredAt
- [x] Updated buildCertificate() in WIDPanel.tsx: appends full HAAI Authorship Declaration block to downloaded .txt certificate when HAAI fields are present
- [x] Added HAAI fields display to WIDPanel modal: shows declaration fields inline in the provenance record
- [x] Passed HAAI fields from song data to WIDPanel in SongDetailPage.tsx
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Feature: Admin Data Rights Tab + Sovereign Migration DB + HAAI Certificate Fields
- [x] Added platformSettings table to drizzle/schema.ts (key/value store for sovereign migration stage and notes)
- [x] Seeded platformSettings with default sovereignMigrationStage=hosted
- [x] Added listDeletionRequests(), markDeletionRequestProcessed(), getPlatformSetting(), setPlatformSetting() helpers to server/db.ts
- [x] Added trpc.admin.listDeletionRequests query: returns all users with dataDeletionRequestedAt set
- [x] Added trpc.admin.markDeletionRequestProcessed mutation: sets dataDeletionProcessedAt on user record
- [x] Added trpc.admin.getSovereignMigrationStatus query: reads stage+notes from platformSettings DB table
- [x] Added trpc.admin.setSovereignMigrationStatus mutation: updates stage+notes in platformSettings DB table
- [x] Added trpc.onboarding.getSovereignMigrationStatus public query: reads stage from DB for /privacy page
- [x] Built DataRightsTab component in AdminUsersPage.tsx with deletion requests table and Mark Processed action
- [x] Built SovereignMigrationAdmin panel in DataRightsTab: stage dropdown + notes + Save button
- [x] Replaced hardcoded migration tracker on /privacy page with live SovereignMigrationTracker component
- [x] Added HAAI fields to WIDPanelProps interface and buildCertificate() output
- [x] HAAI Authorship Declaration block appended to downloaded .txt certificate when fields are present
- [x] Added HAAI fields display to WIDPanel modal inline provenance record
- [x] Passed HAAI fields from song data to WIDPanel in SongDetailPage.tsx
- [x] TypeScript: 0 errors | Tests: 131/131 passing

## Feature: Creator Projects (Crowdfunding)
- [ ] Add projects, projectUpdates, projectDonations tables to schema
- [ ] Add project db helpers (create, get, update, list, donate)
- [ ] Add tRPC procedures: projects.create, projects.get, projects.update, projects.addUpdate, projects.donate
- [ ] Build public /project/:slug page matching sketch (banner, video hero, content blocks, donate bar)
- [ ] Build creator dashboard /dashboard/projects page (list + create/edit)
- [ ] Wire Stripe donate checkout (10% platform fee via Connect)
- [ ] Register /project/:slug route in App.tsx
- [ ] Add Projects link to creator dashboard sidebar

## Feature: Projects v2 - Inline Canvas + Discovery
- [ ] projectBlocks table (ordered content blocks: text/image/video/divider)
- [ ] tRPC procedures: saveBlocks, publishProject (auto-generates WID), getPublicProjects
- [ ] Inline editable ProjectPage canvas (click-to-edit, block editor)
- [ ] Image/video upload blocks via S3
- [ ] WID auto-generated on project publish
- [ ] Projects tab on CreatorProfilePage with Netflix card feed
- [ ] Projects horizontal scroll row on HomePage
- [ ] Projects horizontal scroll row on ExplorePage

- [x] Projects v2: projectBlocks table for inline content editing
- [x] Projects v2: inline editable ProjectPage canvas (click-to-edit sections, image/video upload)
- [x] Projects v2: WID generated on project publish
- [x] Projects v2: creator profile Projects tab with Netflix-style horizontal scroll feed
- [x] Projects v2: Creator Projects horizontal scroll row on HomePage

## Feature: Share Links Fix
- [ ] Fix music share: remove /share/:wid fallback, always use /song/:id
- [ ] Fix project share: add share button to project page with correct URL
- [ ] Add OG meta route for /project/:slug (server-side)
- [ ] Register /share/:wid server route that redirects to /song/:id via WID lookup

## Feature: Projects Nav + Notifications + Share Modal
- [ ] Add Projects nav link to TopBar next to Explore
- [ ] Add donor notification when creator posts project update
- [ ] Add full Share modal with copy link and Twitter/X share to project pages

## Phase 44: Three Creator Projects Enhancements
- [x] Follow Project button — DB table, tRPC follow/unfollow, notification on project updates
- [x] Featured Projects section on Explore page
- [x] Image upload in project update modal (MyProjectsPage)

## Phase 45: Follow-up Improvements
- [x] Bump What's New changelog to v2.22.0 — mention Follow Project feature
- [x] Wire batch follower notifications in addUpdate procedure (already wired in Phase 44)
- [x] Add Projects nav link to top bar next to Explore (already present in CORE_NAV)

## Phase 46: Creator Lights On / Lights Dim Toggle
- [ ] Add lightsMode column (enum: 'dim' | 'on') to users table, default 'dim'
- [ ] Add profile.setLightsMode tRPC procedure (protected)
- [ ] Add Lights toggle control to ProfilePage (creator's own settings)
- [ ] Apply lights-on/dim theme to CreatorProfilePage based on creator's stored setting

## Phase 46: Global Lights On / Lights Dim Toggle
- [x] Add lightsMode column (enum: 'dim' | 'on') to users table, default 'dim', DB migration
- [x] Add profile.getLightsMode (public) and profile.setLightsMode (protected) tRPC procedures
- [x] Build LightsModeContext — fetches owner's setting on app load, applies .lights-on CSS class to <html>
- [x] Define .lights-on CSS variable overrides in index.css (espresso crème palette)
- [x] Wire LightsModeContext into App.tsx / main.tsx
- [x] Add Lights On / Dim toggle control to creator's ProfilePage settings panel

## Phase 47: Lights Mode Polish
- [x] Add CSS transition (background-color 0.45s, color 0.35s) to html/body for graceful palette fade
- [x] Persist lightsMode in localStorage — hydrate synchronously at module load to eliminate flash
- [x] Bump What's New modal to v2.23.0 with Espresso Crème / Lights toggle entry
## Phase 48: Lights Mode Filter Refinement
- [x] Reduce filter intensity to very subtle warm tint (sepia 0.18, brightness 1.12, contrast 0.95, hue-rotate 4deg)
- [x] Exclude music player bar (PlayerBar + MobilePlayerLayer) via data-no-filter attribute
- [x] Images, video, canvas already counter-filtered to stay colour-accurate

## Phase 49: Lights On — Precise Palette Variables
- [x] Replace .lights-on CSS filter with full variable overrides (8 designer tokens)
- [x] Map: background=#F5F0E8, card-1=#EDE8DC, card-2=#E8E0D0, card-3=#E2D9C8, accent=#C4A882, text-primary=#2C1A0E, text-secondary=#6B4C35, gold=#B8963E
- [x] Remove data-no-filter from PlayerBar and MobilePlayerLayer (filter approach gone)

## Phase 50: Lights On — Onyx Coffee Palette
- [x] Replace Espresso Crème tokens with Onyx-inspired clay/terracotta/olive/charcoal palette
- [x] Surface: dusty clay-rose #C4876A → card depth steps #B87A5E / #A86D52 / #986046
- [x] Text: warm linen #F2EDE8 (primary), muted linen #D4BFB0 (secondary)
- [x] Accent/borders: deep forest olive #4A5C3A
- [x] Gold: warm amber #B8963E (retained)

## Phase 51: Lights On Surface Palette Revision
- [x] Shift four surface vars lighter: #C4876A→#E8C4A8, #B87A5E→#DFB898, #A86D52→#D6AC8A, #986046→#CCAA82
- [x] Foreground updated to espresso #2C1A0E for legibility on light surfaces
- [x] All other tokens unchanged (olive border/CTA, cathedral gold)

## Phase 52: data-theme Theme System Migration
- [x] Replace .lights-on CSS block with [data-theme="dark"] and [data-theme="warm"] in index.css
- [x] Update LightsModeContext to set data-theme attribute on <html> instead of .lights-on class
- [x] Update localStorage key from lnx_lights_mode to lnx_theme
- [x] Bump What's New to v2.24.0 — document proper theme system
- [x] Run 137 tests against both themes — all pass

## Phase 53: Warm Theme — Nav & Sidebar Only
- [x] Apply --bg-nav: #EDE4D8, --text-nav: #2C1A0E, --accent-nav: #B8963E to TopBar in warm theme
- [x] Apply --bg-sidebar: #E5D8C8 to sidebar in warm theme
- [x] Remove body filter from [data-theme="warm"] so music cards/player stay dark
- [x] Music cards, player bar, track pages untouched (no changes made to those components)

## Phase 54: Bug Fixes (User Report Apr 6)
- [x] Fix QuickRefSlider close arrow not registering taps on mobile (enlarged tab w-8 h-20, added touchstart listener, enlarged X button to 36px min)
- [x] Fix What's New version badge in TopBar drawer (updated v2.18 → v2.24)
- [x] Fix What's New version badge in MainLayout mobile sidebar (updated v2.18 → v2.24)
- [ ] Comment reply system — DB has no parentId column yet; needs schema migration before threading can be built

## Phase 55: Comment Threading + Warm Mobile Nav + Profile Bio Cache
- [x] Add parentId column to comments table (nullable int, self-referential FK)
- [x] Run pnpm db:push to migrate (migration 0054_mature_leopardon.sql applied)
- [x] Add comments.addReply tRPC procedure (protected, requires parentId)
- [x] Update comments.getBySong to return replies nested under parent comments
- [x] Render threaded replies on SongDetailPage — reply button, indented reply list, reply input
- [x] Apply warm theme inline styles to renderMobileNavItem in MainLayout (text color, active bg)
- [x] Fix profile.me staleTime/refetchOnMount so bio always loads fresh on profile page visit

## Phase 56: Warm Theme Overlay Rework
- [x] Change warm nav background from solid #EDE4D8 to translucent warm tint rgba(160,110,40,0.55) over dark base
- [x] Change warm sidebar background from solid #E5D8C8 to translucent warm tint rgba(140,95,30,0.50) over dark base
- [x] Adjust warm text colors to light amber (rgba(255,230,160,0.92)) readable against dark blended surface
- [x] Desktop TopBar mega-menu warm tint uses same overlay approach
- [x] Mobile sidebar warm tint uses same overlay approach

## Phase 57: Steel Tint Rework
- [x] Replace amber rgba(160,110,40,0.55) nav tint with steel rgba(75,90,108,0.38) in TopBar
- [x] Replace amber rgba(140,95,30,0.50) drawer tint with steel rgba(60,75,92,0.35) in TopBar
- [x] Update text colors to cool silver-white rgba(210,220,235,0.88) for steel theme
- [x] Apply same steel tint to MainLayout mobile header/sidebar

## Phase 58: Steel Tint Opacity + Blur Reduction
- [x] Lowered steel nav tint to rgba(55,68,85,0.72) with dark base dominant in TopBar
- [x] Lowered steel drawer tint to rgba(42,55,70,0.80) in TopBar
- [x] Increased backdrop-filter blur to blur(32px) saturate(0.7) on nav, blur(40px) saturate(0.6) on drawer
- [x] Applied same opacity/blur values to MainLayout mobile header/sidebar

## Phase 59: Lights On Body Text Contrast Reduction
- [x] Fixed warm theme body filter: removed brightness(1.28) boost, now brightness(0.96) contrast(0.92) saturate(0.88) — no more 28% brightness amplification
- [x] Kept sepia(0.04) and hue-rotate(2deg) for subtle cool-steel tint on page content
- [x] --foreground and card/popover/sidebar foreground unchanged (dark theme values apply via CSS cascade)
- [x] Warm theme CSS block surfaces still have old cream-clay values but body filter is now the primary contrast control

## Phase 60: Fix Faded Gold Accent in Lights On Mode
- [x] Raised saturate() from 0.88 to 1.0 so gold accent text stays vivid
- [x] Kept brightness(0.94) and contrast(0.90) for the dimming effect
- [x] Reduced sepia to 0.03 and hue-rotate to 1deg for minimal tint
