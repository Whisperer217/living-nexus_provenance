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
