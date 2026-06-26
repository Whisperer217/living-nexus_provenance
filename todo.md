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

## Phase N+10: HAAI Origin Story + Batch Upload Grid + Edit Work Button
- [x] haaiOriginStory column added to drizzle/schema.ts and migrated to DB
- [x] haaiOriginStory added to songs.ts upload and update procedures
- [x] haaiOriginStory added to HAAIDeclarationForm (prominent first field with deep textarea)
- [x] haaiOriginStory added to UploadPage initialization and draft hydration
- [x] haaiOriginStory added to BatchUploadPage TrackCard interface and makeEmptyCard
- [x] haaiOriginStory added to trackPayloads in BatchUploadPage handleSubmit
- [x] batchOriginStory state + textarea added to BatchFill panel
- [x] haaiOriginStory applied in applyBatchFill
- [x] TrackCardUI accordion replaced with compact visual grid slots (3-col desktop / 2-col tablet / 1-col mobile)
- [x] New TrackDetailPanel slide-out drawer for per-track metadata (all fields including Origin Story)
- [x] detailCardId state + TrackDetailPanel render wired in main BatchUploadPage component
- [x] Add track button redesigned as grid slot with 3/4 aspect ratio
- [x] Edit Work button added to SongDetailPage owner action bar (gold, Cinzel, Pencil icon)
- [x] 0 TypeScript errors, 324/324 tests passing

## Phase N+11: Cover Art Upload Fix + Audio Metadata Stripping
- [x] Root cause identified: FormData appended file before type — busboy saw file stream before type field, so cover art was always stored as audio/
- [x] Fixed FormData field order in UploadPage (type+filename before file)
- [x] Fixed FormData field order in BatchUploadPage
- [x] Fixed FormData field order in EditTrackPanel
- [x] Fixed FormData field order in ComicEnvironment
- [x] Fixed FormData field order in LyricsEnvironment
- [x] Fixed FormData field order in ManuscriptEnvironment
- [x] Fixed FormData field order in MusicEnvironment
- [x] Fixed FormData field order in VideoEnvironment
- [x] Fixed FormData field order in StoryboardBuilder (also added credentials:include)
- [x] Created server/services/audioMetadataStrip.ts — ffmpeg strips all ID3/EXIF tags from audio before S3 upload (fail-open: returns original on error)
- [x] Wired stripAudioMetadata into /api/upload-file for all audio MIME types
- [x] Switched audio upload path from streaming Forge relay to buffer+strip+storagePut
- [x] Missing Cover Art banner on SongDetailPage confirmed working (owner-only, with Add Art button)
- [x] MediaAsset component confirmed handles null/missing src with Music icon fallback
- [x] 0 TypeScript errors, 324/324 tests passing

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
- [x] Add `witnesses` table to schema (witnesserId, witnessedId, createdAt)
- [x] Add `references` table to schema (fromUserId, toUserId, toSongId, context, createdAt)
- [x] Run db:push migration
- [x] Add db helpers: witnessCreator, unwatchCreator, isWitnessing, getWitnessCount, getWitnessedByCount, createReference, getReferencesForSong, getReferencesForUser
- [x] Add tRPC procedures: witness.toggle, witness.status, witness.network, reference.create, reference.list
- [x] Add Witness button to CreatorProfilePage (replaces generic follow)
- [ ] Add Reference/Cite panel to SongDetailPage
- [x] Add Witness Network tab to ProfilePage showing who you witness + who witnesses you
- [x] Meaningful notifications: "You were referenced in a witness record", "Your work was cited in a derivation"

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
- [x] TypeScript: 0 errors
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

## Phase 61: WID Verify + OG Meta + Project Title Color
- [x] Fix WID verify to search projects table in addition to works/songs
- [x] Fix OG metadata null-check in server/og.ts (TypeError on project page)
- [x] Fix project title color faded in Lights On mode

## Phase 62: Lights On Mode — Root Cause Fix (Steel Overlay)
- [x] Removed h1-h6 color override ([data-theme="warm"] h1-h6 { color: #2C1A0E }) — was forcing all headings to dark espresso, making project/song titles invisible
- [x] Stripped warm theme CSS variable block — removed cream-clay background/foreground overrides that were flipping page background to #F2EDE8
- [x] Warm theme [data-theme="warm"] block now intentionally empty — dark base tokens remain active
- [x] Steel overlay approach confirmed: only TopBar + MainLayout get the rgba tint via React inline styles
- [x] OG metadata errors confirmed as pre-restart artifacts — no new errors since server restart
- [x] WID verification for PROJ-* WIDs confirmed working in routers.ts

## Phase 63: Projects Section — Move to Top
- [x] Move Projects section above Featured Songs on HomePage
- [x] Move Creator Projects section above Featured Songs on CreatorProfilePage
- [x] Verify projects section renders correctly at top position

## Phase 64: Fix Caption Null Validation Error
- [x] Find caption field in tRPC router/Zod schema that rejects null
- [x] Make caption nullable/optional (z.string().nullable().optional()) or coerce null to empty string
- [x] Fix any frontend code sending null instead of undefined/empty string for caption

## Phase 65: Multi-Fix Batch

- [ ] Update v2.24 What's New changelog to describe steel overlay mechanic accurately
- [ ] Add New Project CTA ghost card in Projects row on home page (for creators with no projects)
- [x] Fix auto-advance to next track bug in audio player (web + mobile)
- [x] Shrink refresh banner — reduce height/padding and fix multi-click dismiss
- [x] Add project archive/unpublish button to ProjectPage management UI

## Phase 67: Restore/Tint/Share + WID Persistence Audit
- [ ] Audit WID changes not persisting - find root cause
- [x] Add Restore to Draft button for archived projects in MyProjectsPage
- [ ] Add mobile bottom nav steel tint in Lights On mode
- [ ] Add Copy Link / Share button on Verify page result card
## Phase 70: Image Block — Adjustable Size & Focal Point
- [x] Add imageSize ("small"/"medium"/"large"/"full") to Block interface in ProjectPage.tsx
- [x] Add imageFocalX / imageFocalY (0-100 percent) to Block interface
- [x] Implement FocalPointDragger component (drag-to-set crosshair overlay, mouse + touch)
- [x] Update BlockView to render image with correct sizeClass, maxH, and objectPosition
- [x] Update BlockEditor to show focal point dragger overlay and size toggle buttons
- [x] Add imageSize / imageFocalX / imageFocalY to saveBlocks Zod schema in routers.ts
- [x] Add imageSize / imageFocalX / imageFocalY to saveProjectBlocks function signature in db.ts
- [x] Verify DB schema already has imageSize enum + imageFocalX/Y int columns
- [x] 137/137 tests passing, 0 TypeScript errors
## Phase 71: Fix Projects Page — Published Projects Not Showing
- [x] Root cause: listPublic Zod schema had max(50) but ProjectsDiscoveryPage passed limit:100, causing silent validation failure
- [x] Fix: raised listPublic input limit max from 50 to 200 in routers.ts
- [x] Verified via direct API call: 1 active project now returned correctly
## Phase 72: Fix Mobile Back Navigation
- [x] Audit wouter router setup — using wouter v3 history mode (pushState), correct
- [x] Root cause: overflow-hidden root + overflow-y-auto scroll container consumed all touch events, blocking browser back-swipe gesture
- [x] Fix: added overscroll-behavior-x: none + touch-action: pan-y to scroll container, main, and root div in MainLayout
- [x] Fix: added overscroll-behavior-x: none to html/body in index.css
- [x] Fix: added overscroll-behavior-x: none + touch-action: pan-y to expanded player sheet and cinematic layer in MobilePlayerLayer
- [x] Verified 0 TypeScript errors
## Phase 73: Fix Expanded Player — Scroll While Playing
- [x] Audit: body overflow lock (document.body.style.overflow = hidden) was blocking iOS Safari scroll inside player
- [x] Audit: swipe-dismiss onTouchMove fired even when user was scrolled down in content area
- [x] Fix: removed body overflow lock — inner scroll container handles its own scroll
- [x] Fix: added scrollContainerRef to scroll area; dismiss gesture now checks scrollTop > 4 and cancels if user is scrolled down
- [x] Fix: added overscrollBehaviorY: contain to scroll container to prevent bounce from triggering dismiss
- [x] 0 TypeScript errors
## Phase 74: Expanded Player UX Enhancements
- [x] Scroll-to-top button: gold-tinted ArrowUp button appears after 80px scroll, smooth-scrolls back to top
- [x] Haptic feedback: navigator.vibrate(10) fires once when drag crosses 60px dismiss threshold; resets if pulled back
- [x] Pinch-to-zoom artwork: two-finger pinch scales art 1x–3x from center; tap-anywhere overlay resets to 1x with spring animation
- [x] 0 TypeScript errors
## Phase 75: Hamburger Menu Fix + OG Meta Tags (Facebook, Discord, X, Messenger)
- [x] Fix: hamburger nav z-index raised to z-[60] so it covers sticky owner toolbar (Edit/Unpublish/Archive)
- [x] Root cause of OG failure: Manus CDN intercepts ALL page routes and serves static bundle + injects generic OG tags, bypassing Express og.ts
- [x] Confirmed: /api/* routes DO reach Express (oEmbed endpoint works perfectly)
- [x] Confirmed: og.ts already has correct OG injection for /song/:id, /creator/:id, /project/:slug, /verify/:witnessId, 15+ static routes
- [x] Confirmed: oEmbed endpoint returns correct song-specific data (title, artist, cover art, embed player)
- [x] Fix A: OEmbedUpdater React component dynamically updates oEmbed <link> href to current page URL on every navigation
- [x] Fix B: OEmbedUpdater also updates <link rel="canonical"> for Facebook/Messenger canonical URL
- [x] Fix C: oEmbed endpoint extended to cover /project/:slug (songs and creators already covered)
- [x] Fix D: Added og:image:width/height and twitter:site to /api/og/* HTML endpoints
- [x] Fix E: Created /api/og/song/:id, /api/og/creator/:id, /api/og/project/:slug CDN-bypass HTML endpoints
- [x] All three /api/og/* endpoints tested and returning correct title/description/image
- [x] Registered ogApiRouter in server/_core/index.ts
- [x] 0 TypeScript errors

## Phase 76: Mobile Player — Scroll + Back Navigation Fix
- [x] Fix: iOS Safari flex-1 scroll container height bug — added height:0 + minHeight:0 so iOS computes scroll height correctly inside fixed container
- [x] Fix: device back button (Android/iOS) now steps through player states: cinematic → expanded → mini, instead of navigating page history
- [x] Implementation: History API pushState when entering expanded/cinematic; popstate handler intercepts back press and transitions player state
- [x] Cinematic → expanded: back button works; pushes new history entry so next back goes expanded → mini
- [x] Expanded → mini: back button works; releases history back to page navigation
- [x] 0 TypeScript errors

## Phase 77: Mobile Bell Tap Fix + Remove Left Pane
- [x] Fix: mobile header bell button had no onClick handler — was a dead button showing only the badge
- [x] Fix: bell now navigates to /notifications with 44px min tap target (minWidth/minHeight: 44)
- [x] Fix: removed the QuickRef chevron toggle button from mobile header (was taking up space, confusing)
- [x] Fix: QuickRefSlider commented out in MainLayout — can be re-enabled when ready
- [x] Also fixed TopBar (desktop) bell button — increased to 44px tap target and Bell size 18
- [x] Noted: lock screen mini player working confirmed by testers
- [x] Noted: car/Google Assistant integration (Android Auto) logged as future feature
- [x] 0 TypeScript errors

## Phase 78: Mobile Nav Bell + Media Session Skip + QuickRef Bottom Sheet
- [x] Added BottomNavBar component: Home, Explore, Together, Bell (with unread badge), Profile — renders via portal z-[9989]
- [x] MiniBar repositioned to sit 56px above bottom nav; scroll area padding updated to 136px
- [x] Media Session previoustrack/nexttrack already present in PlayerContext.tsx — no change needed
- [x] QuickRefBottomSheet: new swipe-up bottom sheet with search, genre chips, recently added tracks
- [x] Sheet renders via portal above bottom nav, swipe-down 60px to dismiss, pill handle always visible
- [x] Mounted QuickRefBottomSheet in MainLayout replacing commented-out QuickRefSlider
- [x] 0 TypeScript errors

## Phase 79: Live Bell Badge + Now Playing Tab + Haptic Nav
- [ ] Wire bell badge to trpc.notifications.unreadCount (live, refetch every 30s)
- [ ] Add haptic feedback navigator.vibrate(5) to each BottomNavBar tap
- [ ] Add "Now Playing" tab to QuickRefBottomSheet — cover art, title, artist, mini scrubber
- [ ] Now Playing tab only visible when a track is active in PlayerContext

## Phase 79: QuickRef Now Playing Tab + Haptic Feedback Verification

- [x] Rewrite QuickRefBottomSheet with Now Playing / Discover tab switcher
- [x] Now Playing tab: cover art, title, artist, mini scrubber with currentTime/duration
- [x] Now Playing tab: play/pause, prev/next controls
- [x] Now Playing tab: auto-switches to Now Playing when a new track starts and sheet is open
- [x] Pill handle shows "Now Playing" label when a track is active and sheet is closed
- [x] miniPlayerVisible prop wired to actual player state in MainLayout
- [x] Haptic feedback (navigator.vibrate(5)) confirmed present on all BottomNavBar taps
- [x] Bell badge count wired to trpc.notifications.unreadCount (confirmed from Phase 78)
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 80: Competitive Edge Improvements (vs Audius/SoundCloud/Spotify/Bandcamp)
- [x] Creator Profile: total play count stat already wired (line 611+1074) to profile stats row (visible to visitors)
- [x] Creator Profile: Witness/Follow button already wired from prior phases with follower count display (social proof like SoundCloud)
- [x] Song Detail: Credits section added — creditsJson DB column, upload editor, SongDetailPage display — songwriter, producer, featured artists fields (editable by owner, visible to all)
- [x] Explore: "New This Week" mode added filter mode alongside Infinite/Trending/Randomize
- [ ] Dashboard Analytics: add 7-day vs 30-day toggle for plays chart
- [ ] Dashboard Analytics: add top track trending indicator with percentage change vs prior period
- [ ] Upload: add "Schedule Release" date/time field (future publish date — Spotify/SoundCloud-inspired)
- [ ] Home: add "Trending This Week" section showing top 5 tracks by play velocity
- [x] Home: "New Voices" carousel added (recently joined creators with badge) showing recently joined creators with at least 1 upload

## Phase 80.3: Creator Discovery Polish
- [ ] Tighten New Voices cutoff from 30 days to 14 days
- [ ] Add isPinned boolean column to users table + db:push migration
- [ ] Wire pinned creator to featuredCreators procedure (pinned always first)
- [ ] Add pin/unpin toggle in Admin panel User Roster tab
- [ ] Bump What's New modal to v2.25 with Phase 80 release notes

## Phase 80.4: Follow-up Improvements
- [x] Credits editor in song Edit/metadata panel (retroactive credits for existing songs)
- [x] New This Week empty state card on Explore page
- [x] Verify pin/unpin functionality end-to-end

## Phase 80.6: Block Editor Improvements
- [ ] Install @dnd-kit/sortable and add drag-to-reorder to block editor
- [ ] Add focal-point drag UI to block image editor
- [ ] Add image upload to project update form

## Phase 80.7: UX Polish
- [ ] Drag-to-reorder blocks with @dnd-kit in ProjectPage
- [ ] Expand scrubber hit-area to 40px in QuickRefBottomSheet
- [ ] Add New This Week upload nudge banner to UploadPage

## Phase 80.8: Activity Feed Routing Bug Fix
- [x] Fix DashboardPage activity feed: PROJECT_PUBLISHED events now link to /projects/{slug} instead of /song/{workId}
- [x] Fix ProfilePage activity feed: /project/ typo corrected to /projects/ (was a dead link)
- [x] Both fixes use evt.songLink (when present) → evt.projectSlug → fallback /song/{workId} priority chain
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 81: Wireframe Implementation (from sketch page 21)
- [x] Featured Projects section redesigned: vertical card stack with 160px banner, artist avatar, title, AI badge, $ funding %, heart button, WID fingerprint badge
- [x] Project cards link correctly to /projects/{slug} (not /project/)
- [x] Start a Project CTA row at bottom of Featured Projects section
- [x] PlayerBar: playback speed toggle (1x / 1.5x / 2x / 0.75x) added to compact bar right side
- [x] PlayerBar: context menu (⋯ kebab) added — Go to Song / Share / Download / Add to List / View Queue
- [x] Context menu closes on outside click
- [x] Speed toggle syncs to audio element playbackRate
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 82: Provenance Prompt Generator — Identity Lock
- [x] Added `isShared` boolean column to `promptDrafts` schema (default false), migrated DB (migration 0060)
- [x] Added `revokePromptDraftShare` helper in db.ts
- [x] `getSharedPrompt` now refuses to serve prompts where `isShared = false` (private by default)
- [x] `getSharedPrompt` returns creator attribution (name, handle, id) for watermark display
- [x] Added `revokeShare` protectedProcedure (owner-only) to promptStudio router
- [x] Prompt Studio dialog shows a "Profile-Locked Tool" locked state for non-owners
- [x] Full studio UI only renders when `isOwner === true`
- [x] Draft archive: Share button is conditional — shows "Revoke" when already shared (isShared=true)
- [x] SharedPromptPage rebuilt with creator identity badge, provenance watermark footer auto-appended to all copy actions
- [x] SharedPromptPage shows "Prompt Not Available" locked state for unshared/revoked prompts
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 83: Upload Sort Order Fix
- [x] Changed `getSongsByUser` sort from `desc(createdAt)` to `asc(createdAt)` — first upload now appears at top, latest at bottom
- [x] Added `asc` to drizzle-orm import in db.ts
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 84: Creator Track Display Order (Drag-to-Reorder)
- [x] Added `displayOrder` integer column to songs table (default 0), migration 0061 applied
- [x] Added `reorderSongs` db helper (bulk update displayOrder by userId + ordered id array, ownership-safe)
- [x] Added `songs.reorder` protectedProcedure (owner-only, validates all song IDs belong to requesting user)
- [x] Updated `getSongsByUser` to sort by `displayOrder ASC, createdAt ASC` (unset=0 falls back to upload date)
- [x] Updated `getPublicSongs` to sort by `displayOrder ASC, createdAt ASC` when a creatorId filter is active
- [x] Fixed ArchivePage drag-reorder mutation: was calling non-existent `songs.reorderMySongs` with `songIds` — now correctly calls `songs.reorder` with `orderedIds`
- [x] Drag handles (GripVertical) already present in Archive track list rows — now fully wired to persist order via HTML5 drag events
- [x] Optimistic update: local list reorders immediately on drop, rolls back on server error
- [x] Creator profile page song list respects displayOrder (via getSongsByUser)
- [x] Explore page respects creator's displayOrder when showing their tracks (via getPublicSongs creatorId path)
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 85: Featured Projects Card Fixes
- [x] Fixed broken project link URL in Featured Projects section — all 4 link/button hrefs changed from `/projects/:slug` to `/project/:slug` (matching the registered route)
- [x] Fixed same broken link in DashboardPage activity feed (`/projects/` → `/project/`)
- [x] Fixed same broken link in ProfilePage activity feed (`/projects/` → `/project/`)
- [x] Capped Featured Projects card banner image height from 160px to 120px (no longer full-viewport tall)
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 86: v2.26 Changelog + Mobile Nav + Redirect Alias
- [x] Bumped What's New modal to v2.26 with Phase 82 (Prompt Studio Identity Lock), Phase 84 (Custom Track Order), Phase 85 (Project Link Fix) entries
- [x] Added Projects tab (Rocket icon) to mobile bottom nav — replaces Together tab; Home / Explore / Projects / Signals / Profile
- [x] Registered /projects/:slug as client-side redirect alias → /project/:slug in App.tsx (wouter Redirect)
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 87: Platform Trust & Transparency
- [x] Ran live Q1 2026 engineering audit on livingnexus.org (SSL, headers, TTFB, deps, tech fingerprint)
- [x] Produced signed audit report (SHA-256: d894a3a64c29e027e41bad444ca87f04d8c69ad4f9bd94567fba7940a2750847)
- [x] Added `platformAuditLogs` table to schema (migration 0062)
- [x] Added db helpers: getLatestAuditLog, getAllAuditLogs, createAuditLog, updateAuditLog
- [x] Added `audit` tRPC sub-router: getLatest (public), getAll (admin), create (admin), update (admin)
- [x] Built Admin Audit Log page at /admin/audit (admin-only, 14-layer form with evidence fields + signed artifact generator)
- [x] Built public /trust page with hero, overall status badge, artifact hash + copy, 14-layer grid, verification instructions
- [x] Seeded Q1 2026 audit record (conditional_pass — CSP/Permissions-Policy headers missing)
- [x] Registered /admin/audit and /trust routes in App.tsx
- [x] Added "Platform Trust" link to desktop TopBar drawer and mobile MainLayout drawer
- [x] 137/137 tests passing, 0 TypeScript errors

## Phase 88: Player UI Cleanup — Remove Quick Access Strip, Fix Duplicate Player
- [x] Remove Quick Access / discovery scroll strip that overlaps the global player bar
- [x] Fix expanded player sheet so it fully replaces the mini bar (no stacking/layering)
- [x] Remove duplicate "NOW PLAYING" label (appears in both mini bar and as floating pill)
- [x] Park right-side horizontal playlist slider as future feature (pre-made / build-your-own playlists)

## Phase 89 — Playlist Drawer, Player Fixes, Featured Cards

- [x] Build right-side playlist drawer (PlaylistDrawer component) with swipe-in animation from right edge
- [x] Add small tab trigger on right edge of screen to open/close the drawer
- [x] Populate drawer with pre-made playlists: New Releases, Trending, Your Liked, Build Your Own
- [x] Fix global player z-index so expanded modal (z-[9995]) always renders above playlist drawer
- [x] Add "Discover" tab to expanded player sheet alongside "Now Playing" with 3-5 related tracks
- [x] Double Featured Project card banner height: 120px → 240px in HomePage.tsx
- [x] Double Featured Project card banner height: h-28 → h-56 in ExplorePage.tsx

## Phase 89: Right-Side Playlist Drawer + Discover Tab + Player Z-Index + Featured Card Size
- [x] Build right-side playlist drawer component (PlaylistDrawer) with small tab trigger on right edge
- [x] Drawer shows pre-made playlists: New Releases, Trending, Your Liked, Build Your Own
- [x] Drawer must not overlap expanded player modal (z-index layering: drawer < player)
- [x] Add Discover tab to expanded player sheet showing 3-5 related tracks to queue
- [x] Verify swipe-down gesture on expanded player dismisses to mini bar correctly
- [x] Double Featured Project card banner height: 120px → 240px in HomePage.tsx
- [x] Double Featured Project card banner height in ExplorePage.tsx: h-28 → h-56
- [x] 0 TypeScript errors

## Phase 89b — Playlist Drawer Refinements + Discover Tab + Featured Card 2× Resize
- [x] Confirmed PlaylistDrawer tab trigger at bottom: calc(safe-area + 100px) - above player bar
- [x] Confirmed z-index hierarchy: drawer (z-9000/9001) < mini bar (z-9990) < expanded (z-9995)
- [x] Added DiscoverPanel component to MobilePlayerLayer with related tracks query
- [x] Added Now Playing / Discover tab bar to expanded player sheet
- [x] Doubled Featured Project card banner height in HomePage: 240px → 360px (2× TrackCard 180px)
- [x] Doubled Featured Project card banner height in ExplorePage: h-56 → h-[360px]

## Phase 89c — Featured Project Card Size Correction
- [x] Revert banner height to 180px in HomePage and ExplorePage (matches TrackCard)
- [x] Ensure 2-column grid layout so each card is ~half the viewport width

## Phase 89d — Featured Projects Swipeable 2×2 Carousel
- [x] Build FeaturedProjectsCarousel component: paged 2x2 grid, touch swipe left/right, dot indicators
- [x] Replace static grid in HomePage with FeaturedProjectsCarousel
- [x] Replace static grid in ExplorePage with FeaturedProjectsCarousel

## Phase 90 — Mini Player Visualizer + 3-Dot Menu + Carousel Enhancements
- [ ] Add vertical audio visualizer bars (CSS animation) to mini player bar when playing
- [x] Add 3-dot MoreVertical menu to mini player bar with track settings (queue, artist, share, etc.)
- [x] Add 5-second auto-advance timer to FeaturedProjectsCarousel (pauses on touch)
- [x] Overlay project title + funding % on banner image (remove separate info row)
- [ ] Add 'New' badge pill to projects created within the last 7 days

## Phase 90 — Mini Player Visualizer + 3-Dot Menu + Carousel Enhancements
- [x] Add vertical audio visualizer bars to mini player bar when playing
- [x] Add 3-dot MoreVertical menu to mini player bar with track settings
- [x] Add 5-second auto-advance timer to FeaturedProjectsCarousel (pauses on touch)
- [x] Overlay project title + funding % on banner image (remove separate info row)
- [x] Add New badge pill to projects created within the last 7 days

## Phase 91 — Bug Fixes: Quick Play + Desktop 3-Dot Menu
- [x] Fix PlaylistDrawer flattenSong: use song.fileUrl (not song.audioUrl) so tracks have valid audio URLs
- [x] Fix PlayerBar z-index from z-50 to z-[9985] so context menu dropdowns render above PlaylistDrawer
- [x] Fix PlaylistDrawer panel: add pointer-events-none when closed to prevent blocking desktop player clicks

## Phase 92 — Desktop Player Fix + Project Page Improvements
- [x] Fix desktop PlayerBar 3-dot menu and volume slider (real click blocker)
- [ ] Fix project banner image: proper aspect ratio, object-cover with object-top, no stretching
- [ ] Add zoom-on-click lightbox for project banner image
- [ ] Add video upload field to project editor
- [ ] Add narration (audio) upload field to project editor
- [ ] Add drag-to-reorder for project tracks/media items

- [x] Fix desktop PlayerBar overflow-hidden clipping volume and 3-dot menu dropdowns
- [x] Fix project banner focal point default (positionY 15→50 for portrait images)
- [x] Add narration audio upload to project editor (S3 upload, NarrationUploadPanel)
- [x] Add narration player on project page (NarrationPlayer component)
- [x] Add direct video upload to project editor (S3 upload via VideoUploadPanel)
- [x] Add project songs linked tracks panel (ProjectSongsPanel)
- [x] Add drag-to-reorder for linked project tracks (DnD Kit)
- [x] Add song picker to link tracks from creator catalog to project
- [x] Add projectSongs junction table to DB schema
- [x] Add narrationUrl/narrationKey fields to projects DB schema
- [x] Add tRPC procedures: projects.getSongs, projects.addSong, projects.removeSong, projects.reorderSongs
- [x] Add tRPC procedures: projects.uploadNarration, projects.uploadVideo

## QR Identity Card System
- [ ] Add qr_shares table to DB schema (entity type, entity id, sharer userId, campaign tag, scan count)
- [ ] Add qr_scans table (share id, IP hash, user agent, timestamp)
- [ ] Add tRPC procedures: qr.generate, qr.logScan, qr.getStats
- [ ] Build QRIdentityCard component (canvas-based visual card with QR + creator info)
- [ ] Add PNG export from canvas
- [ ] Add share button to creator profile page
- [ ] Add share button to project pages
- [ ] Add share button to song pages
- [ ] Add attribution ref params to landing URLs (?ref=&context=&ts=)
- [ ] Log scan events when ref param is present on page load
- [ ] Write vitest tests for QR procedures

## QR Identity Card System
- [ ] Add qr_shares table to DB schema
- [ ] Add qr_scans table to DB schema
- [ ] Add tRPC procedures: qr.generate, qr.logScan, qr.getStats
- [ ] Build QRIdentityCard component
- [ ] Add PNG export from canvas
- [ ] Add share buttons to creator/project/song pages
- [ ] Log scan events with attribution params
- [ ] Write vitest tests for QR procedures

## QR Identity Card System
- [x] DB schema: qrShares and qrScans tables
- [x] Server: createQrShare, logQrScan, getQrStats, listQrShares db helpers
- [x] Server: qrRouter with generate, logScan, getStats, list procedures
- [x] Client: QRIdentityCard canvas renderer with PNG export
- [x] Client: QRShareModal wrapper component
- [x] Client: useQrScanLogger hook for attribution tracking
- [x] Client: QrScanLogger wired into App.tsx
- [x] Creator profile: QR share button replaces plain share button
- [x] Project page: QR ID Card button alongside existing share button
- [x] Song detail page: QR ID Card button alongside existing share button
- [x] Tests: 11 QR unit tests passing

## Donation Fix + Project Identity
- [x] Fix project donation Stripe checkout flow (payment not captured)
- [ ] Fix donation progress bar not updating after payment
- [ ] Add WID pill to project pages and project cards
- [ ] Improve project banner visual identity (distinguishing design)

- [x] Fix project donation - remove Stripe Connect requirement so donations work without connected account
- [x] Fix donation progress bar - refetch project data 3s after returning from Stripe with ?donation=success
- [x] Add green WID pill to project banner (BannerDropZone) matching player style
- [x] Improve project banner status badges with color-coded styling (draft/funding/completed)
- [x] Add provenance accent line at bottom of banner (green when witnessed, gold when not)
- [x] Update WID badge in FeaturedProjectsCarousel to green (was purple)
- [x] Update WID badge in ProjectsDiscoveryPage to green with verify link

## Audit Fixes (Apr 2026)
- [x] Fix LiveActivityPanel missing key props (song.id → item.song.id)
- [x] Fix QR buildShareUrl using /projects/ instead of /project/ (broken QR scans)
- [x] Fix volume slider CSS rotation → writing-mode vertical (no more clipping)
- [x] Fix PlayerBar z-index from 9985 to 9995 (popups now above QuickRefBottomSheet)
- [x] Fix volume popup container height hack removed (native vertical slider)
- [x] Fix WID badge on mobile: tapping WID in song rows/cards no longer triggers the player or opens the quick access panel — badge now stops event propagation and navigates to /verify/:witnessId (CreatorProfilePage SongRow + context menu, DiscoverPage card)
- [x] Fix Quick Play tab trigger auto-opening when Donate button tapped on mobile: tab trigger now hides (opacity:0, pointer-events:none) whenever any dialog/modal is open, detected via MutationObserver watching body[data-scroll-locked] and body style overflow
- [x] Fix Share Identity Card modal not scrollable on mobile: moved overflow-y-auto to backdrop, sticky header, canvas scales with min(240px, 100vw-4rem)
- [x] Fix project banner: object-contain + clamp height so full character visible on all screen sizes
- [x] Save LAMININ.md to /docs/LAMININ.md and link from README.md as first architecture doc
- [x] Fix Quick Play tab trigger: slide fully off-screen (right:-28px) when any dialog/modal is open + 100ms polling fallback
- [x] Fix React hooks order violation in MobilePlayerLayer (useLightsMode called after early return — caused blank screen on mobile)

## Codebase Audit Fixes (Apr 8 2026)
- [x] Fix raw SQL string at routers.ts:2195 — replaced with typed Drizzle db.update() via new setPinCreator helper
- [x] Add rate limiting to public write endpoints (comments.add, songs.play, songs.download) via express-rate-limit
- [x] Reduce global JSON body limit from 50mb to 1mb; keep 50mb only on upload route
- [ ] Extract shared adminProcedure middleware to replace 20+ inline role checks
- [ ] Add LIMIT to unbounded DB queries (notifications, creators, supporters, promo codes)
- [ ] Add try/catch to ~120 unhandled server mutations
- [x] Add DB indexes: songs(userId, status, contentType, witnessId), likes(songId, userId), events(workId, actorId, type), notifications(userId, userId+isRead), jukeboxQueue(roomCode), playlistItems(userId) — 10 indexes pushed
- [x] Fix useEffect missing dependency array in DashboardPage ArchiveTab (was running on every render)
- [x] Add type="button" to 125 button elements missing it across 28 files
- [x] Fix iOS Safari canvas download in QRIdentityCard — use toBlob + object URL with DOM append/remove
- [x] Delete dead files: Home.tsx (stub), ComponentShowcase.tsx (dev artifact with console.log)
- [x] Fix ErrorBoundary to hide stack trace in production (show generic message only)
- [x] Remove console.log from ComponentShowcase.tsx (file deleted)
- [ ] MusicWitnessIDPage.tsx (896 lines) — kept, not yet routed; wire up when ready
- [x] Extract shared adminProcedure middleware — 44 procedures now use adminProcedure, 46 inline role checks removed
- [x] Add LIMIT to 6 unbounded DB queries: getAllCreators (500), getSongsByUser (1000), listFounders (200), listPromoCodes (500), getExpressionLineageByUser (50), getNameHistory (100)
- [x] Add global tRPC errorFormatter — logs unexpected errors server-side, strips stack traces from production responses
- [ ] Replace jukebox 5s polling with SSE push (infrastructure already exists)
- [ ] Split routers.ts (5057 lines) into feature sub-routers under server/routers/

## Self-Improvement Worker

- [x] Add selfImprovementRuns and selfImprovementFindings tables to drizzle schema
- [x] Build server/selfImprovementWorker.ts: scanner, LLM analysis, fix applicator, test runner, DB logger
- [x] Add tRPC procedures: worker.triggerRun, worker.getRuns, worker.getRunById, worker.getFindingsByRun, worker.revertFinding
- [x] Build SelfImprovementPage.tsx: run history, findings table with diffs, revert controls
- [x] Register /admin/self-improve route in App.tsx
- [x] Wire scheduled worker (nightly at 2am via setInterval on server start)
- [x] Add manual trigger button in admin UI + 🤖 Self-Improve button in LN Command Center header

## Donation Feature Bug Fixes

- [x] Fix donation total not updating — $100 payment shows as $0 in goal progress display
- [x] Fix mobile swipe-up panel cutoff — large black dead zone below content on mobile

## Payment Integrity Monitor Worker (Apr 8 2026)
- [x] Add paymentReconciliationLog table to drizzle schema and push migration
- [x] Build server/paymentIntegrityWorker.ts: polls Stripe every 15min, cross-checks DB, auto-reconciles missed credits, notifyOwner on reconciliation
- [x] Wire worker to server startup (runs at startup after 30s delay + every 15 minutes)
- [x] Add tRPC admin procedures: paymentIntegrity.getLogs, paymentIntegrity.getStats, paymentIntegrity.triggerRun
- [x] Build PaymentIntegrityPage.tsx: stats cards, reconciled/failed alerts, full log table
- [x] Register /admin/payment-integrity route in App.tsx
- [x] Add 💳 Payment Integrity button to LN Command Center admin header

## Mobile Bug Fixes (Apr 8 2026)
- [x] Fix Provenance Prompt Generator button triggering Quick Play panel instead of navigating to prompt studio
- [x] Fix large black dead zone below bottom nav bar on mobile screens

## Bug Fixes
- [x] Fix GiftModal wrong song — $ button passes index to parent, parent uses tracks[index] which is wrong when Discover and Trending share the same handler; fix by passing the track object directly instead of index
- [x] Step 4 — Wire GiftModal through overlayController: add overlayOpen("gift") on mount, overlayClose("gift") on unmount
- [x] Step 5 — Wire EditTrackPanel through overlayController: replace direct body.style.overflow with overlayOpen("edit-track") / overlayClose("edit-track")
- [x] Manuscript-aware upload flow — show manuscript metadata fields (category, synopsis, author, page count, language) instead of music fields when content type is manuscript
- [x] Manuscript-aware EditTrackPanel — conditionally render manuscript fields vs music fields based on song.contentType

## Stabilization Sprint (Approved 2026-04-10)
- [x] Step 1 — Close route-change scroll lock gap: overlayCloseAll() on location change in App.tsx
- [ ] Step 2 — Extract shared format constants to shared/contentTypes.ts
- [ ] Step 3 — Add parentSongId nullable FK to songs table
- [x] Step 4 — Add workType discriminator to events table
- [x] Fix hamburger menu overscroll escape on mobile — panel translates past its bounds when scrolling hits the end of content
- [x] Fix mobile expanded player backdrop bleed — dragging past top boundary surfaces full-page black backdrop
- [x] Fix mobile player controls unresponsive on Explore page — pointer-events blocked by background layer
- [x] Fix PlaylistDrawer right-side panel overscroll escape on mobile — same momentum bleed as hamburger menu
- [x] Fix viewport floor overscroll — main page scroll container bleeds past bottom boundary exposing black void behind app
- [x] Audit and seal overscroll gaps in WID panel, Comments sheet, EditTrackPanel
- [x] Swap useEffect to useLayoutEffect in OverlayRouteGuard
- [x] Step 2 — Extract shared constants to shared/contentTypes.ts
- [x] Step 3 — Add parentSongId to songs table (lineage bridge)
- [x] Step 4 — Add workType discriminator to events table

## Slimdoggy Bug Report — Apr 13 2026

- [x] #S1/#S4 — Witnessing/Witnesses counts on creator profile are not clickable; add modal showing the list of creators being witnessed / witnessing, each linking to their profile page
- [x] #S2 — "Edit Profile" button on Artist Profile page redirects to Creator Dashboard instead of profile edit form — fixed: now routes to /profile
- [x] #S3 — Non-audio works (manuscripts, comics, lyrics) appear in the "Now Playing" Live Activity panel; filter to audio-only — fixed: LiveActivityPanel filters to contentType=audio
- [x] #S5 — Bio section has invisible border artifact; creator name truncates ("DOC SERAPH MER...") on profile page — fixed: name now break-words, bio border cleared
- [x] #S6 — "Send a Gift" from creator profile attaches to the first song in the Featured Songs list instead of being creator-level — fixed: new createCreatorTipCheckout procedure, no songId required
- [x] #S7 — PayPal not available as a payment method (Stripe-only); documented: Stripe handles card payments; PayPal integration is a future roadmap item

## Bug Report — Apr 14 2026 (book/-1 crash)

- [x] /book/-1 crash: songs.getById called with id=-1 (invalid sentinel); server returns undefined → React Query error "Query data cannot be undefined" — fixed: server now returns null, client guards with bookId > 0; same fix applied to SongDetailPage

## Bug Report — Apr 14 2026 (Explore songIds too_big)

- [x] Explore page: "Too big: expected array to have <=100 items" on songIds batch query — fixed: server cap raised from 100 to 500; client-side slice(0, 500) guard added on ExplorePage

## Feature Request — Apr 14 2026 (Bug-Kill badge visibility)

- [x] Show 🐛 BUGS KILLED badge on Moshai's and Slimdoggy's public creator profiles (not admin-only) — fixed: showBugBadge = isAdminProfile || isBuildContributor (handles: slimdoggy, moshai)
- [x] Show 🐛 BUGS KILLED badge on the Attribution/About page — added Build Integrity section with live counter after QA Testers

## Bug Report — Apr 15 2026 (Explore infinite loop)

- [x] /explore: "Maximum update depth exceeded" — fixed: replaced unstable [songs] dep with stable [mode, activeGenre, query, contentType, seed]; also fixed db.ts contentType enum cast and AdminUsersPage listActive → list invalidate

## Bug Report — Apr 15 2026 (mobile contrast)

- [x] Mobile sidebar DISCOVER nav items nearly invisible after --ln-void shift to #111009 — fixed: MainLayout nav items white/40→white/70, DISCOVER items ln-iron→rgba(255,255,255,0.65), section labels white/20→white/45, What's New white/40→white/65, Log Out white/35→white/60; TopBar NAV_TEXT_MUTED #6B6555→#A89880; ProfilePage/FieldNotesPage/5 other pages bulk-lifted white/20-35→white/45-55

## Founder Onboarding — Complete
- [x] Add founderWid column to users table in drizzle/schema.ts and push migration
- [x] Fix Stripe webhook: add founder_purchase case → auto grantFounder + generate WID-FDR-*
- [x] Dashboard Founder success banner: show after /founders?founder=success redirect
- [x] Simplified onboarding checklist: 3-step card on first dashboard visit (Sign in → Handle → Upload)

## Bug — Scroll Lock While Playing
- [x] Body scroll locked when expanded player is open — fixed: split overlay-active CSS into light (overflow only) and full (position:fixed) variants; mini-bar drag no longer freezes page scroll

## Railway Commit b6daeba — .mus Upload + Processing Status Strip
- [x] Fix lyrics file input accept attribute — now accepts .txt, .mus, .musicxml, .mxl, .xml (was .txt only)
- [x] Raise lyrics file size limit from 500 KB to 2 MB (notation files are larger)
- [x] Add MusicXML smart extraction — extracts <lyric><text> nodes in order; falls back to stripping XML tags
- [x] Add processing status strip to Edit Track panel (Processing/Done/Error states with step labels)
- [x] Status strip: Save metadata → "Saving metadata…" → green check (auto-dismiss 2.5s)
- [x] Status strip: Witness lyrics → "Reading lyrics file…" → "Computing cryptographic hash…" → "Generating WID-LYR…" → green check
- [x] Status strip: Replace audio → "Reading audio file…" → "Computing file hash…" → "Uploading audio to secure storage…" → "Generating new WID-MUS…" → green check
- [x] Status strip: Error state shows red alert + message + Dismiss button

## Railway Commit 9c4efc8 — Silent Playback Fix + Content-Type Border Colors
- [x] Fix silent playback after page refresh — one-time mount effect sets audio.src + audio.load() from restored session track so togglePlay() has a valid src immediately
- [x] Fix content-type tile border colors — dim values updated from dark hex (#8B6914 etc.) to rgba with 0.38-0.40 opacity matching Upload page palette; chip borders brightened to 0.35 opacity
- [x] Assessment: Cloudflare login race condition — confirmed not a code issue (Turnstile not present); edge proxy warming on cold Railway deployment, no action required

## Phase 2a Provenance Engine Integration (from ln-provenance-engine)

- [ ] Clone ln-provenance-engine and copy client pages (CreatorSurface, Keeper, WIDLookup, FloatingAvatar)
- [ ] Copy server/provenance.ts utility file
- [ ] Merge server/db.ts provenance + keeper DB helpers
- [ ] Merge server/routers.ts tRPC procedures (anchor, events, keeper, skins, PPG)
- [ ] Merge drizzle/schema.ts — add agents, events, wids, keeper_skins tables
- [ ] Copy LN-PHASE2-SPEC.md for reference
- [ ] Register /create, /keeper, /wid/:wid routes in App.tsx
- [ ] Apply DB migrations 0001, 0002, 0003
- [ ] TypeScript check — 0 errors
- [ ] Tests passing

## Commit 4186fba — Keeper System Integration (from living-nexus_provenance)
- [x] FloatingAvatar.tsx — StarCraft orb widget with mode ring, cinematic mode, now playing, real chat input
- [x] KeeperAvatarWidget.tsx — self-contained wrapper managing state and trpc.keeper.chat calls
- [x] KeeperPage.tsx — /keeper character screen with 6 skins, live stats, mode selector
- [x] App.tsx — /keeper route registered, KeeperAvatarWidget mounted at app level (floats over every page)
- [x] server/routers.ts — keeper router: getProfile, unlockSkin, setActiveSkin, uploadCustomPortrait, chat
- [x] drizzle/schema.ts — keeperSkins table definition (bigint import added)
- [x] drizzle/0081_keeper_skins.sql — keeper_skins table created in DB
- [x] Fix TS errors: KeeperAvatarWidget implicit any, witnesses.userId → witnesserId, bigint import
- [x] Resolve _journal.json merge conflict (kept ownership_disclaimer as 0080, keeper_skins as 0081)
- [x] Apply all pending migrations via apply-migrations.mjs (16 applied, 68 skipped)

## Keeper Widget + Sidebar Layout Fixes
- [x] Lift Keeper orb above global PlayerBar (zIndex 9050, bottom 92px desktop)
- [x] Make Keeper orb visible on mobile (orbBottom uses max() to clear mobile nav+mini stack)
- [x] Make Live panel pull tab visible (gold accent border, dark bg, gold glow shadow)
- [x] Make PlaylistDrawer pull tab visible (gold accent border, dark bg, gold glow shadow)

## Commit e7ce7fc — Album Download Feature
- [x] Pull commit e7ce7fc from living-nexus_provenance
- [x] Apply drizzle/0082_album_download.sql migration (albumDownloadPermission + albumDownloadPriceCents on projects table)
- [x] Fix TS errors: bigint import in schema.ts, implicit any in routers.ts and ProjectPage.tsx
- [x] CSS variable fix c8fb9b4 (--ln-panel, --ln-obsidian, --ln-panel-border) merged

## Phase 2b — Mobile Fixes + Keeper Creative Sandbox

- [ ] Fix 404 on /creator route — check App.tsx routing for creator-surface/creator page
- [ ] Fix KeeperPage mobile layout — right column (Keeper Loadout) clips off-screen on mobile, needs single-column stack
- [ ] Fix FloatingAvatar expanded panel mobile visibility — hard to see on mobile
- [ ] Build Keeper Creative Sandbox — micro text/image editor in expanded Keeper panel with rich text (bold/italic/highlight), image upload, Keeper minimized to corner, Keeper can assist with selected text
- [x] PPG (Provenance Prompt Generator) wired into Keeper Creative Sandbox (PPG tab)
- [x] KeeperPage back button fixed (was navigating to /create, now navigates to /)
- [x] KeeperPage mobile layout — single column stack on mobile, 3-col on md+

## Phase 3 — Marketplace

- [ ] Stripe integration (split payments: creator cut + platform cut at transaction level)
- [ ] DB schema: marketplace_items table (type, title, price_cents, creator_id, wid, artwork_url, stock, active, royalty_pct)
- [ ] DB schema: marketplace_purchases table (item_id, buyer_id, stripe_payment_intent, amount_cents, creator_payout_cents, status, fulfilled_at)
- [ ] tRPC: marketplace.listItems (public, filterable by type: album | skin | physical | creator_good)
- [ ] tRPC: marketplace.getItem (public, single item with full creator provenance)
- [ ] tRPC: marketplace.createCheckout (protected, Stripe checkout session with split payment)
- [ ] tRPC: marketplace.webhook (Stripe webhook handler, fulfillment + WID anchor on purchase)
- [ ] tRPC: marketplace.myPurchases (protected, buyer history with provenance receipts)
- [ ] tRPC: marketplace.creatorSales (protected, creator earnings dashboard)
- [ ] /marketplace full page — featured drops, gated albums, Keeper skins, creator goods
- [ ] Right-side mini marketplace drawer (global, persistent, quick-buy surface)
- [ ] Creator earnings widget on dashboard
- [ ] WID anchor on every marketplace item purchase (provenance receipt generated on fulfillment)
- [ ] Playlist feature (create, name, add tracks, public/private) — feeds into marketplace drawer

## Phase 4 — Keeper Sandbox AI Features
- [ ] tRPC procedure: keeper.transcribeVoice — upload audio to S3, call Whisper, return text
- [ ] tRPC procedure: keeper.generateArtwork — take prompt + style tags, call imageGeneration, return S3 URL
- [ ] tRPC procedure: keeper.analyzeImage — accept image URL, call LLM with image_url content, return analysis
- [ ] Write tab: mic button with hold-to-record, auto-transcribe into editor on release
- [ ] PPG tab: "Generate Art" button after prompt is generated, shows result image with save/download option
- [ ] Sandbox: image drop zone + upload, sends to Keeper for visual analysis in chat thread

## Phase 47: Fix Audio Playback (Silent Audio Bug)
- [x] Fix useFrequencyGlow: AudioContext suspended state silences audio when glow is enabled on page load
- [x] Fix: only call createMediaElementSource after explicit user gesture (glow toggle), not on mount
- [x] Ensure AudioContext.resume() is awaited before connecting source node
- [x] Guard: if AudioContext is suspended and cannot resume, fall back to static glow without connecting
- [ ] Remove orphaned MobilePlayerPanel.tsx (no longer mounted anywhere — replaced by MobilePlayerLayer)

## Phase 48: Keeper Skin Selector Wiring
- [x] Audit KeeperPage skin cards — confirm unlockSkin/setActiveSkin tRPC procedures exist in routers.ts
- [x] Wire "Equip" button on each skin card to setActiveSkin mutation (optimistic update)
- [x] Wire "Unlock" / "Purchase" button to unlockSkin mutation or Stripe checkout for paid skins
- [x] Active skin card shows gold ring + "EQUIPPED" badge
- [x] Locked skin card shows lock icon + price; unlocked-but-not-active shows "Equip" CTA

## Phase 49: Seed Marketplace Listings
- [x] Add marketplace.seedDefaults protected mutation to routers.ts (idempotent, 6 items)
- [x] Add "⊕ Seed Default Listings" button to MarketplacePage empty state (logged-in users only)
- [x] Invalidates listItems cache on success so items appear immediately
- [ ] Verify /marketplace page and MarketplaceDrawer SHOP tab render real items (requires production deploy)

## Phase 50: Desktop Drag for FloatingAvatar
- [x] Add mousedown hold handler (200ms threshold) to FloatingAvatar orb for desktop drag
- [x] mousemove updates position, mouseup ends drag — same clamp logic as touch
- [x] Position persists to localStorage (same key as touch drag)
- [x] No conflict with click-to-open-panel (short click still opens panel)

## Phase 51: Deep Audio Playback Fix (Persistent Silence)
- [x] Audit PlayerContext: audio element creation, src assignment, play/pause lifecycle
- [x] Audit safeAudioUrl: check if URL transformation is stripping or corrupting audio src
- [x] Audit useFrequencyGlow: verify the fix from Phase 47 is not breaking audio on non-glow path
- [x] Check for double-instantiation of AudioContext or createMediaElementSource across components
- [x] ROOT CAUSE: glowEnabled defaulted to TRUE (opt-out) in PlayerBar + MobilePlayerPanel
- [x] Fix: change glowEnabled init from !== 'off' to === 'on' in both components
- [x] Commit 979b5f2 pushed to main — clean fast-forward, zero conflicts

## Phase 52: Writer Voice Recorder UX Fix
- [x] Add visible Stop button during recording (separate from mic toggle)
- [x] Add "Transcribe" action button after recording stops
- [x] Clear recording blob state after transcription is inserted into editor
- [x] Ensure recording can be cancelled without transcribing

## Phase 53: Keeper Image Upload Vision Fix
- [x] Audit how uploaded image URL is passed to the LLM in the Keeper chat pipeline
- [x] Ensure image_url content block is sent in the LLM messages array (not just text)
- [x] Fix: LLM must receive the actual image as a vision input, not just a text label
- [x] sendSandboxToKeeper now calls analyzeImage mutation for each image, passes full analysis to chat
- [x] Fallback to text-only if vision fails; sandboxImages cleared after send

## Phase 54: Marketplace Navigation
- [x] Add Marketplace tab to mobile bottom nav (between existing tabs, below global player)
- [x] Marketplace tab uses ShoppingBag icon with gold ring surround
- [x] Desktop top nav: add gold-bordered "MARKETPLACE" pill with gradient bg + glow + shimmer underline
- [x] Desktop nav entry uses distinct gold border to stand out from all other nav items
- [x] Both link to /marketplace route
- [x] Commit 3f1d07c pushed to main — clean fast-forward, zero conflicts

## Phase 55: Remove AI Transform (Sonauto)
- [x] Remove songs.aiTransform and songs.getTransformStatus tRPC procedures from routers.ts
- [x] Remove songs.getMyTransforms tRPC procedure from routers.ts
- [x] Remove aiTransforms table from drizzle/schema.ts
- [x] Remove createAiTransform, updateAiTransform, getAiTransformById, getAiTransformsBySong, getAiTransformsByUser, getTransformsByWitnessId helpers from server/db.ts
- [x] Remove AI Transform modal, state, mutations, and button from SongDetailPage
- [x] Remove My Transforms tab, query, helpers, and tab content from DashboardPage
- [x] Remove getTransformsByWitnessId import and lineage section from workRoute.ts
- [x] Final grep sweep: zero AI Transform references remain in codebase
- [x] Commit 357a969 pushed to main — -552 lines net, clean fast-forward, zero conflicts
- [ ] Drop aiTransforms table SQL on production DB (optional cleanup, table is now unused)

## Phase 56: Router Split
- [ ] Deferred — to be done as a dedicated session once codebase stabilizes

## Phase 57: VisualQueue Migration
- [x] Applied drizzle/0032_purple_zombie.sql on builder DB — visualQueue table now exists
- [x] Production already had the table; builder now in sync

## Phase 58: Follow System
- [x] Confirmed already implemented as Witness system (witnessCreator, unwatchCreator, isWitnessing, getWitnessCount, getWitnessNetwork)
- [x] Witness button fully wired on CreatorProfilePage with count display and Witness Network modal

## Phase 59: TypeScript Cleanup
- [x] Add provenanceEvents table to schema.ts + migration 0085_romantic_fenris.sql
- [x] Add provenance event DB helpers: insertProvenanceEvent, getProvenanceEventsByCreator, getWidWithEvent, insertWid, getOrCreateAgent, updateAgentFingerprint, setUserPublicKey
- [x] Add satchel router (checkpoint/anchor/fork/list)
- [x] Add ppg router (generate with LLM)
- [x] Add agents router (me/getOrCreate/message/updateFingerprint)
- [x] Add wids router (lookup with flattened shape/register)
- [x] Add auth.hasKeypair + auth.generateKeypair
- [x] Fix CreatorSurface.tsx: trpc.satchel.* calls, agentMessage shape, result.text coercion
- [x] Restore getSongByWitnessId to db.ts
- [x] ZERO TypeScript errors — confirmed by tsc watcher: Found 0 errors
- [x] Commit 8fb3180 pushed to main — clean rebase, zero conflicts

## Phase 60: OAuth Callback Fix (BLOCKING)
- [ ] Diagnose "OAuth callback failed" error at /api/oauth/callback on production
- [ ] Check if the error is caused by a state/origin parsing regression from recent commits
- [ ] Check if JWT_SECRET or OAUTH_SERVER_URL env vars are missing/changed on production
- [ ] Check if the oauth.ts core handler was accidentally modified
- [ ] Fix root cause and push to production

## Phase 61: Route + Donation Fix + Marketplace Art
- [x] Register /creator-surface route in App.tsx
- [x] Fix donation progress bar — invalidate projects.getBySlug in confirmDonation onSuccess
- [x] Marketplace tables applied to production DB (0084_boring_stryfe.sql)
- [ ] Marketplace item artwork — generate + upload images for 6 seeded items (items already have CDN artwork URLs from Keeper skin assets)

## Phase 62: Keeper AI Overhaul
- [x] Audit KeeperPage.tsx, KeeperAvatarWidget.tsx, keeper tRPC router — understand current state
- [x] Define 5 distinct persona profiles (Guide, Conductor, Witness, Custodian, Archivist) with unique system prompts and capability flags
- [x] Add keeperNotes DB table (userId, personaId, title, content, imageUrl, createdAt, updatedAt)
- [x] Apply keeperNotes migration to production DB
- [x] Rich input panel already existed: lyrics/notes textarea, image upload with preview, voice recorder
- [x] Wire images directly as multimodal content blocks to LLM (no pre-analysis stripping)
- [x] Voice recorder already wired to transcription API
- [x] Upgrade LLM call: pass full conversation history (last 20 turns), persona system prompt, image blocks
- [x] Add "Save Note" button — persists current textarea + image to keeperNotes table
- [ ] Add Notes panel/drawer in Keeper UI — lists saved notes, click to reload into chat (deferred)
- [x] Persona switcher shows 5 personas with distinct accent colors
- [x] Each persona has a distinct capability badge (Direction, Structure, Testimony, Archive, Semantics)
- [x] Commit, checkpoint, push to GitHub

## Phase 63: Keeper Archetype Attribute System + Structured Output

- [ ] Define per-archetype base attribute profiles for all 5 personas (Guide, Conductor, Witness, Custodian, Archivist) — each has distinct base values for Voice Depth, Lyrical Density, Structural Logic, Emotional Range, Provenance Depth, Corpus Size
- [ ] KeeperPage: clicking an archetype applies that archetype's base values to sliders (boosts/overrides), user can still manually adjust after
- [ ] Save attribute state per-archetype so switching back restores last manual state
- [ ] Pass all 6 attribute values into the keeper.chat tRPC call and inject them into the system prompt as behavioral parameters (e.g. "Lyrical Density: 85/100 — prioritize dense, multi-layered lyric writing")
- [ ] Detect lyrics/instrumentation requests and format output as structured song layout (verse/chorus/bridge sections with instrumentation notes inline)
- [ ] Corpus Size slider maps to LLM max_tokens (100 words = ~150 tokens baseline, scales to ~2000 tokens at max)
- [ ] Commit, checkpoint, push to GitHub

## Phase 64: Upload Form Contrast Fix (Mobile)
- [x] Brighten UploadPage form inputs — higher contrast backgrounds, visible labels on mobile
- [x] Ensure all form fields (Title, Genre, BPM, Key, Album, ISRC, BMI, Mood Tags, Credits) are legible on dark mobile screens

## Phase 65: Full Production DB Migration
- [x] Apply full schema to production — create songs, tips, projects, playlists, comments, and all other missing tables
- [x] Verify all schema tables exist on production
- [x] Fix border/borderRight CSS shorthand conflict warning

## Phase 66: GitHub Sync + Mobile Bug Fixes
- [x] Push Phase 65 changes to GitHub (commit 26a1031 on main)
- [x] Fix artist handle wrapping on mobile — add whitespace-nowrap + overflow-hidden + min-w-0 to HandleField display div
- [x] Fix What's New modal not opening — wire mobile header bell to open WhatsNewModal; fix drawer "What's New" button; bump version label to v2.31.0

## Phase 67: Enriched Upload System (MakerWorld-Inspired)
- [x] Schema migration: headlineCaption, description, galleryImagesJson, playerAssetType, aiToolSuno, aiToolUdio, aiToolSonato, aiToolOther, aiToolOtherName added to songs table
- [x] Catch-up migration: all missing songs + users columns applied to production DB
- [x] Single upload page: headline caption field, description field, AI Draft button (uses gallery images as visual context for LLM), gallery image upload with per-image captions, player asset type designation
- [x] Batch upload page: album-level toggles (Album Art Across All, Album Art AI/Original), per-track AI disclosure radio (Original/HAAI/AI Assisted/AI Generated), per-track AI tool toggles (Suno 5+, Udio, Sonato, Other), per-track release date field, Repeat Across Tracks button in Batch Fill panel
- [x] Song detail page: headline caption section, long-form description section, gallery grid (2-3 col, click to expand, per-image captions), clear visual separation from player/actions
- [x] generateCaption router: upgraded to accept imageUrls array (up to 6), builds multimodal LLM message with image_url content blocks for richer description generation

## Phase 68: Frequency Glow Audio Routing Fix
- [x] Fix Frequency Glow toggle silencing audio — toggle now only controls RAF visualizer loop, never disconnects Web Audio graph
- [x] Rewrote ensureAudioGraph() — idempotent, handles InvalidStateError gracefully (element already connected), source node stays permanently connected
- [x] AudioContext destination always wired through analyser so audio reaches speakers regardless of glow state
- [x] Glow toggle off → stops RAF animation only; audio routing untouched

## Phase 69: Microsoft Store-Inspired Home & Explore Redesign
- [x] Build reusable ShowcaseRow component — horizontal scroll, section title with "See All" arrow, ← → nav arrows, snap scrolling
- [x] Build reusable StoreTrackCard component — tall rectangle, cover art dominant, creator avatar + name + WID badge pinned to bottom, play on hover
- [x] Build reusable StoreCreatorCard component — banner image, avatar, name, follower count, WID badge
- [x] Rebuild Home page hero — 3-slide carousel, cross-fade, dot pagination, auto-rotate every 5s, prev/next arrows
- [x] Home page showcase rows — New Arrivals, Trending This Week, Featured Creators, Recently Witnessed
- [x] Rebuild Explore page — compact header, horizontal pill chips, Store/Classic view toggle, ShowcaseRow + StoreTrackCard in Store view
- [x] Ensure mobile responsiveness — hero stacks vertically, cards remain large and tappable (snap-x scroll)
- [x] TypeScript 0 errors, checkpoint, GitHub push

## Phase 70: Keeper Notes Drawer + What's New v2.32.2 + LSP Flush

- [x] Add v2.32.2 entry to WhatsNewModal.tsx — emoji reactions fix, slug keys, onError toast
- [x] Build Keeper Notes slide-out drawer in KeeperPage.tsx — NOTES button in top bar, list notes, reload (copy+navigate), delete, tag badges, image previews
- [x] Flush stale LSP watcher conflict markers — touch schema.ts
- [x] TypeScript 0 errors, checkpoint, GitHub push, release notes

## Phase 71: Global Player — Frequency Glow + Audio Playback Audit

- [x] Audit useFrequencyGlow hook — RAF loop correct, issue was missing crossOrigin on Audio element
- [x] Fix frequency glow visual — added crossOrigin=anonymous to Audio element in PlayerContext; expanded glow to radiate inset + sides + downward (not just upward)
- [x] Audit PlayerContext addAndPlay pipeline — pipeline is correct end-to-end; null fileUrl tracks silently skip (by design)
- [x] Confirm audio element src is set and play() is called correctly — confirmed, safeAudioUrl is correct
- [x] TypeScript 0 errors, checkpoint, GitHub push, release notes

### Phase 73: Bug Fix — songReactions Production Insert Failure
- [x] Fix songReactions insert failure on production — DB connection pool ECONNRESET (idleTimeout 60s + connectTimeout 10s); sanitize error toast to never leak raw SQL
## Phase 74: Live Waveform Visualizer
- [x] Add useWaveformVisualizer.ts hook — oscilloscope canvas, bezier wave, color shifts violet→gold→cyan with frequency bands
- [x] Canvas behind player controls, pointer-events: none, z-index: 0
- [x] Smooth bezier wave driven by real time-domain audio data (getByteTimeDomainData)
- [x] Shares Web Audio graph with useFrequencyGlow via window globals (no double-connect)
- [x] useFrequencyGlow fftSize bumped 256→2048 for high-res shared data
- [x] Toggled by existing ∿ Frequency Glow button (same localStorage key)
- [x] WhatsNewModal bumped to v2.33.0, RELEASE_NOTES.md updated
- [x] TypeScript 0 errors, checkpoint, GitHub push

## Phase 75: Post-v2.33.0 Checklist
- [x] LSP conflict markers in drizzle/schema.ts — confirmed clean, no markers present (false alarm from stale LSP diagnostics)
- [x] WhatsNewModal — backfilled v2.32.4 (Frequency Glow Visual Fix) and v2.32.5 (Beat-Reactive Glow Pulse) entries between v2.33.0 and v2.32.2
- [x] Keeper chat profile injection — wire ctx.user profile (name, artistHandle, bio, expressionId, EID fields, primaryGenre, toneFrequencyNote, dominantKey, tempoRange, energyProfile, location) into keeper.chat system prompt as CREATOR IDENTITY PROFILE block
- [x] TypeScript 0 errors, checkpoint, GitHub push

## Phase 76: Waveform Position + Mobile Glow Indicator
- [x] Fix desktop waveform canvas position — canvas moved from outer bar wrapper into center controls div (flex-1), constrained to progress bar region only
- [x] Add beat-reactive frequency glow to mobile player audio indicator bars icon — useMobileAudioGlow hook reads window.__lnAnalyser, drives bar heights + violet/gold/cyan color; CSS fallback when glow is off

## Phase 77: Bug Fixes from Slimdoggy Design Feedback
- [x] Fix Featured Creators display names — getAllCreators now excludes creators whose name matches ^Creator[[:space:]][0-9]+$ (auto-generated OAuth placeholder); only shows creators with real artistHandle or non-placeholder name
- [x] Fix pause button on song detail page restarting the song — handlePlay now calls togglePlay() when isThisTrackActive, not addAndPlay()

## Phase 78: Book-Tab Side Drawers Redesign
- [x] Audit LiveActivityPanel (left) and PlaylistDrawer (right) — full structure understood
- [x] Build BookSpineTabs component — vertical protruding spine tabs, Cinzel labels, gold foil active state, 3D lift, dot indicator support
- [x] Wire BookSpineTabs into left LiveActivityPanel — tabs: Live, Playing, Tips on right spine edge; new Live tab added with recently-registered content
- [x] Wire BookSpineTabs into right PlaylistDrawer — tabs: New, Trending, Liked, Build on left spine edge; old horizontal tab bar removed
- [x] Tabs start from top of page (topOffset=52), stacked vertically, 72px each with 2px gap
- [x] Active tab raised with translateX lift + gold border + glow shadow; inactive tabs dark recessed
- [x] Parchment-toned dark interior (warm rgba(18,15,10) gradient) replaces old blue-grey
- [x] Page-edge rule at top of each drawer (thin gold border + subtle gold tint)
- [x] TypeScript 0 errors, checkpoint, GitHub push

## Phase 79: Bug Fixes v2.34.1
- [x] Fix Recently Witnessed song cards — removed Link wrapper from StoreTrackCard, card click now calls handlePlay(); Go to Song still in 3-dot menu
- [x] Fix book-tab drawers — solid near-black backgrounds (#0a0806 gradient), removed backdropFilter blur
- [x] Fix book-tab drawers — clicking active tab now toggles drawer closed (BookSpineTabs onTabClick checks isOpen state)
- [x] Fix cinematic mode duplication — compact bar guard changed to !isExpanded && !isCinematic; cinematic overlay controls unaffected
- [x] TypeScript 0 errors, checkpoint, GitHub push
## Phase 80: Book-Tab Drawer Collapse Fix (v2.34.2)
- [x] Root cause identified: BookSpineTabs rendered inside sliding panel div in LiveActivityPanel — tabs slid off-screen with panel when drawer closed
- [x] Fix LiveActivityPanel: moved BookSpineTabs to a separate fixed-position sibling div outside the sliding panel; `left` property transitions in sync with panel's `transform`
- [x] Verified PlaylistDrawer (right side) already had correct architecture — no change needed
- [x] Verified: tabs visible at left edge when drawer closed (left:0px), slide to right edge when open (left:272px)
- [x] Verified: clicking active tab collapses drawer; clicking any tab when closed opens drawer
- [x] WhatsNewModal bumped to v2.34.2 with drawer fix, StoreTrackCard play fix, Featured Creators filter entries
- [x] Added v2.34.0 entry (Book-Tab Spine Drawers redesign) to WhatsNewModal
- [x] RELEASE_NOTES.md updated with v2.34.2 and v2.34.0 entries
- [x] TypeScript 0 errors, checkpoint, GitHub push

## Phase 90: Unified Drawer Handle Pattern (v2.35.0)
- [x] Rebuild LiveActivityPanel — single centered handle, self-contained isOpen state, createPortal, inline styles matching MarketplaceDrawer
- [x] Rebuild PlaylistDrawer — single centered handle, createPortal, inline styles matching MarketplaceDrawer
- [x] Remove parent-controlled liveOpen/setLiveOpen from MainLayout
- [x] WhatsNewModal bumped to v2.35.0 with unified drawer entry
- [x] RELEASE_NOTES.md updated with v2.35.0 entry

## Phase 91: Individual Stacked Tab Handles (v2.36.0)
- [x] LiveActivityPanel — each tab (LIVE/PLAYING/TIPS) is its own individual protruding handle, stacked top-to-bottom on left edge
- [x] PlaylistDrawer — each tab (NEW/TREND/LIKED/BUILD) is its own individual protruding handle, stacked top-to-bottom on right edge
- [x] Clicking tab opens drawer + switches section; clicking active tab collapses drawer
- [x] Active tab handle: gold border accent + gold background tint
- [x] Panel header shows active section name (no pill row)
- [x] TypeScript: 0 errors
- [x] WhatsNewModal bumped to v2.36.0
- [x] RELEASE_NOTES.md updated with v2.36.0 entry

## Phase 92: SHOP Tab in Right Drawer Stack (v2.36.1)
- [x] Add SHOP tab to PlaylistDrawer TABS array (⊛ icon)
- [x] SHOP tab click dispatches ln:open-shop custom event and closes PlaylistDrawer
- [x] MarketplaceDrawer listens for ln:open-shop event and opens itself
- [x] TypeScript: 0 errors
- [x] WhatsNewModal bumped to v2.36.1

## Phase 100: Collections & Likes System
- [x] Schema: add `collections` table (id, userId, name, description, sortOrder, createdAt)
- [x] Schema: add `collection_tracks` table (id, collectionId, songId, sortOrder, addedAt)
- [x] Schema: add `sort_order` column to `song_likes` table
- [x] Backend: collections.create, list, rename, delete procedures
- [x] Backend: collections.addTrack, removeTrack, reorderTracks procedures
- [x] Backend: likes.reorder procedure (update sort_order on song_likes)
- [x] Backend: likes.getOrdered query (returns liked tracks sorted by sort_order)
- [x] AddToCollectionModal component — + button on track cards, modal with collection list + New Collection
- [x] LIKED drawer tab — reorderable liked tracks (drag-to-reorder)
- [x] BUILD drawer tab — collections list, open collection to see tracks, reorder/remove
- [x] Profile page Likes tab — full card grid of liked tracks
- [x] Profile page Collections tab — named collection folders, expandable card view, create new collection

## Phase 101: Bug Fixes — Legacy Playlists Visibility + Nav Fix (v2.38.1)
- [x] ProfilePage Collections tab — add legacy playlists section below userCollections (playlists.mine + playlists.getById)
- [x] PlaylistDrawer BuildCollectionsPanel — fix legacy playlists query (getTracks → getById), add "My Playlists" section
- [x] MainLayout hamburger menu — "My Profile" → /profile, "Creator Page" → /creator/{id}
- [x] WhatsNewModal bumped to v2.38.1 with all three fix entries
- [x] RELEASE_NOTES.md updated with v2.38.1 entry

## Phase 102: Desktop GlobalPlayer — Contained Floating Card (v2.39.0)
- [x] Desktop layout: clamp(680px, 50vw, 820px) width, bottom-right anchor (right: 32px, bottom: 24px), left: auto
- [x] Desktop shape: border-radius 20–24px all sides (fully detached floating card, not docked tray)
- [x] Desktop expanded state: centered modal overlay (fixed, top/left 50%, translate -50%/-50%, 900px × 700px max)
- [x] Desktop interaction: chevron/expand button as primary toggle (click-first), drag as secondary
- [x] Desktop positioning: anchored bottom-right by default, optional bottom-left toggle, no free drag
- [x] Floating orb: hover → glow hint, click → open panel, hidden in expanded state
- [x] Desktop glass: backdrop-filter blur(18px), background rgba(0,0,0,0.75)
- [x] Desktop glow: directional — 0 -8px 24px gold upward + 0 12px 32px black depth
- [x] Sidebar respect: player right: 32px / left: auto — never spans behind sidebar
- [x] Visual refinements: tighten glow radius, add translateY(6px) elevation, 3-tier button hierarchy, 3px crisp progress bar, knob-only glow

## Phase 103: Schema Cleanup + Changelog (v2.39.1)
- [x] Fix 4 stale git conflict markers in drizzle/schema.ts (lines 6, 1396, 1424, 1425) — confirmed no markers exist; stale .tsbuildinfo cache cleared
- [x] Add WhatsNewModal v2.39.0 entry describing desktop player redesign
- [x] Update RELEASE_NOTES.md with v2.39.0 entry

## Phase 104: GlobalPlayer Interaction Upgrade (v2.40.0)
- [x] Play button: circular 56px on mobile, 40px on desktop split layout
- [x] Mobile Float layout: centered vertical stack (artwork → title → progress → controls)
- [x] Desktop Float layout: horizontal split — [72px artwork] [Title + Meta + Progress + Controls]
- [x] Artwork-only swipe gesture: left=next, right=prev, 60px threshold, rubber-band resistance, direction hint overlay
- [x] Swipe gold glow shift: glow direction follows swipe direction (directional box-shadow)
- [x] Comments icon in Float action row and Expanded action row
- [x] Comments drawer: right-side panel on desktop (400px, bottom-right anchored), bottom sheet on mobile (70vh)
- [x] Cinematic mode: tap artwork in expanded state → full-screen blurred bg, center artwork, minimal controls, auto-hide overlay
- [x] Cinematic swipe: artwork swipe navigation works in cinematic mode
- [x] Cinematic desktop: full-screen centered (not bottom sheet)
- [ ] Swipe preview: next/prev track artwork slides in from swipe direction (deferred — needs queue lookahead)
- [ ] Timestamped comments: @1:32 format support (deferred)
- [ ] Slow zoom / parallax motion on cinematic artwork (deferred)

## Phase 105: WhatsNew v2.40.0, Tip Wiring, Comments Moderation
- [x] Add WhatsNewModal v2.40.0 entry (5 interaction upgrades)
- [x] Update RELEASE_NOTES.md with v2.40.0 entry
- [x] Verify GlobalPlayer Tip button wires to PlayerTipModal (confirm tipsEnabled + tipOpen state) — confirmed already wired
- [x] Add commentReports table to drizzle/schema.ts (0092_flippant_wonder_man.sql, applied to DB)
- [x] Apply commentReports migration — CREATE TABLE IF NOT EXISTS applied via node/mysql2
- [x] Add createCommentReport / getFlaggedComments / moderateCommentReport DB helpers to server/db.ts
- [x] Add comments.report / comments.getFlagged / comments.moderate tRPC procedures
- [x] Add Flag button to comments drawer (hover-reveal, red on active, calls comments.report)
- [x] Build /admin/comments moderation page (admin-only, dismiss/delete actions, reason badges)
- [x] Register /admin/comments route in App.tsx
- [x] toast import added to GlobalPlayer.tsx
- [x] tsc --noEmit: 0 errors (ProfilePage stale cache excluded)

## Phase 106: Nebula Mode — Tip Modal Z-Layer Fix + Player Suspension (v2.42.0)
- [ ] Raise PlayerTipModal z-index to 10000 (above GlobalPlayer z-index 9000)
- [ ] Set modal container to 100dvh, internal content area scrollable
- [ ] Sticky CTA button pinned to bottom of modal
- [ ] Bottom padding on modal content = player height (80px mobile) so CTA never clips
- [ ] Player suspension (Option A): fade to 0.15 opacity + translateY(12px) when tip modal opens, restore on close
- [ ] PlayerContext: expose tipModalOpen state or use a context/event signal to GlobalPlayer
- [ ] Nebula Mode state machine: IDLE → NEBULA → CONFIRM → COMPLETE
- [ ] Full-screen takeover on "$" tap: background dissolves, nebula expands to 100dvh
- [ ] Amount buttons: orbiting/pulsing layout in nebula mode
- [ ] Swipe-down or X to exit nebula → collapse back to player
- [ ] Audio-reactive nebula: waveform drives background motion (CSS animation tied to isPlaying)

## Phase 106 Status Update (completed)
- [x] PlayerTipModal z-index raised to z-[10000] (above GlobalPlayer z-[9000])
- [x] Modal scrollable content area (overflow-y-auto, overscroll-contain)
- [x] Sticky CTA button at bottom of modal (flex-shrink-0, borderTop)
- [x] Bottom margin = 88px (player height + breathing room)
- [x] maxHeight = calc(100dvh - 100px)
- [x] Player suspension: data-tip-modal-open body attribute set on mount
- [x] GlobalPlayer reads data-tip-modal-open via MutationObserver
- [x] GlobalPlayer opacity: 0.15 + pointerEvents: none when tip modal open
- [x] Smooth opacity transition (0.4s ease) on player container
- [x] Nebula Mode state machine: compact → nebula → confirm → complete
- [x] Nebula entry button (Sparkles icon) in compact modal header
- [x] Full-screen blurred artwork background in nebula state
- [x] Nebula particle overlay with audio-reactive CSS animation (isPlaying)
- [x] Orbiting amount buttons (scale up on selected, spring transition)
- [x] Swipe-down gesture to exit nebula (80px threshold)
- [x] Swipe indicator pill with parallax follow
- [x] Cinematic artwork with float animation when isPlaying
- [x] Sticky CTA in nebula mode with state-aware label
- [x] createPortal to document.body for proper z-layer ownership
- [x] tsc --noEmit: 0 errors confirmed

## Phase 107: GlobalPlayer UI State Persistence
- [x] Audit GlobalPlayer for key prop, conditional mount, or state that resets on currentSong change
- [x] Audit PlayerContext for any dispatch/action that resets UI state on track change
- [x] Root cause: useEffect([currentTrack?.id]) at line 284 forced setZone('MINI') + setDragHeight(null) on every track change
- [x] Fix: removed the collapse-on-track-change useEffect entirely
- [x] Confirmed no key prop on <GlobalPlayer /> in MainLayout.tsx
- [x] Confirmed no remount trigger in PlayerContext dispatch
- [x] zone, cinematic, commentsOpen, tipOpen, dragHeight all persist across track changes
- [x] tsc --noEmit: 0 errors (stale watch daemon errors are ProfilePage/CommentModerationPage cache artifacts)

### Phase 108: System Architecture v1.0 Lock
- [x] AppShell CSS grid: 72px LeftRail + fluid MainColumn + 320px RightRail, height: 100vh
- [x] LeftRail: icon-only mode switcher (72px), always visible, direct route navigation
- [x] ContextDrawer: slide-in overlay for mobile/detail views, controlled by open/onClose props
- [x] ContextDrawer: 220ms cubic-bezier(0.22,1,0.36,1) slide animation
- [x] TopBar: removed mega dropdown nav, kept search + Prompt Gen + Register Work + notifications + profile
- [x] GlobalPlayer: repositioned to left:88px, right:336px, bottom:24px (spans MainColumn only)
- [x] AIGuide: orbBottom raised to 140px (above player), draggable offset preserved
- [x] No duplicate navigation systems
- [x] Player persists across routes (already confirmed)
- [x] No UI tied to track lifecycle (already confirmed)
- [x] RightRail: 320px contextual signals panel (SIGNALS / PROVENANCE VERIFIED / WITNESS REGISTRY)
- [x] getNotifications raw SQL fix (refId column name mismatch resolved)
- [x] WhatsNewModal bumped to v2.43.0 with Phase 108 entries
- [x] RELEASE_NOTES.md updated with v2.43.0 entry
- [x] TypeScript: 0 errors
- [x] GitHub push: fc9dea0..c7c61cb

## Phase 108 Stabilization (from QA review)
- [x] RightRail data binding: verified — API calls fire correctly, empty states are accurate (no data in DB yet)
- [x] Z-index hierarchy: fixed — TopBar z-[400], ContextDrawer z-[300], LeftRail z-[200], AIGuide z-[9050], GlobalPlayer z-[9000]
- [x] Layout overflow: confirmed — overflow-x not set on html (intentional: Radix Dialog portals need viewport clipping); MainLayout root div uses overflow-hidden
- [x] Hero section spacing: confirmed — hero carousel has pb-12 on content, ShowcaseSection adds natural spacing below
- [x] Drawer edge bleed: confirmed — LeftRail dark bg is intentional; it's the rail itself at x:0 width:72
- [x] AI Guide position: confirmed — orbBottom = max(140px, ...), orbRight = 24px + drag offset
- [x] Player state: confirmed — GlobalPlayer uses PlayerContext (global PlayerProvider in App.tsx), not page-level state

## Phase 109: Unified Isomorphic Navigation System
- [x] shared/navItems.ts: single NAV_ITEMS source of truth (HOME/EXPLORE/PROJECTS/MARKETPLACE/UPLOAD/DASHBOARD/ARCHIVE/BUILD)
- [x] LeftRail v2: removes all path/direct-navigate; every click calls onDrawerToggle(mode)
- [x] ContextDrawer v2: full NavList from NAV_ITEMS, portaled, 220ms cubic-bezier, one-open-at-a-time
- [x] ContextDrawer: click outside closes, Escape closes, route change closes
- [x] ContextDrawer: overlay only (translateX), no layout push, independent scroll
- [x] MobileNavDrawer: new component, full-screen portal drawer from NAV_ITEMS
- [x] MobileNavDrawer: Hamburger in mobile header opens drawer, route change closes
- [x] MainLayout v5: replaces old inline mobile nav with MobileNavDrawer
- [x] ln:open-whats-new custom event: ContextDrawer/MobileNavDrawer dispatch, MainLayout listens
- [x] Z-index stack: LeftRail(200) < ContextDrawer(300) < TopBar/MobileHeader(400) < MobileNavDrawer(450)
- [x] TypeScript: 0 errors
- [x] Vite HMR: all updates clean

## Phase 109 Correction: Two-State Drawer Model
- [ ] Restore drawerOpen (boolean) + activeMode (NavMode) as separate state — open controls visibility, activeMode controls meaning/highlighting
- [ ] LeftRail: each icon click sets activeMode to its own id AND opens drawer; clicking active icon toggles drawer closed (but keeps activeMode)
- [ ] ContextDrawer: receives both open + activeMode; uses activeMode for header label and section highlight
- [ ] MobileNavDrawer: same two-state model (open + activeMode)
- [ ] MainLayout: manages both drawerOpen and activeMode state

## Phase 109 Mode-Driven Drawer Rebuild
- [ ] ContextDrawer renders mode-specific panel for each NavMode (not a universal nav list)
- [ ] HOME mode: quick links (Discover, New Arrivals, Trending, Founder's Era)
- [ ] EXPLORE mode: filter/browse links (All Works, Music, Lyrics, Manuscripts, Comics, Visual Art, Creators)
- [ ] PROFILE mode: account links (My Profile, My Works, Collections, Settings, Log Out)
- [ ] UPLOAD mode: creation tools (Register Work, Prompt Studio, Draft Works, Upload History)
- [ ] ARCHIVE mode: archive links (LNA Archive, My Archive, Witnessed Works, Provenance Ledger)
- [ ] Each mode panel has a header with mode name + icon, no universal nav list
- [ ] Player stays dominant (z-index 9000+, drawer never overlaps player)
- [ ] MobileNavDrawer updated to same mode-driven structure

## Phase 111: Interaction System Upgrade
- [x] WhatsNewModal bumped to v2.43.1 with Interaction System Upgrade copy
- [x] DB migration: notifications table now has body, actorId, actorName, actorAvatarUrl, refId, refType columns
- [x] RightRail Signals: loading skeleton, SignalIcon by type, click navigates to song or /notifications
- [x] RightRail: public LIVE ACTIVITY feed for non-logged-in users (globalActivity.feed tRPC procedure)
- [x] globalActivity.feed: raw SQL, polls tips/comments/likes, returns unified activity items
- [x] useNow hook: refreshes timeAgo labels every 30s without re-fetching
- [x] CreatorProfilePage: "Change Banner" button (Camera icon) appears on hover next to Reposition
- [x] CreatorProfilePage: changeBannerMutation + handleChangeBannerFile wired to profile.uploadBanner
- [x] CreatorProfilePage: AI focal point auto-opens positioner after banner change

## Phase 111: Interaction System Upgrade
- [x] WhatsNewModal bumped to v2.43.1 with Interaction System Upgrade copy
- [x] DB migration: notifications table now has body, actorId, actorName, actorAvatarUrl, refId, refType columns
- [x] RightRail Signals: loading skeleton, SignalIcon by type, click navigates to song or /notifications
- [x] RightRail: public LIVE ACTIVITY feed for non-logged-in users (globalActivity.feed tRPC procedure)
- [x] globalActivity.feed: raw SQL, polls tips/comments/likes, returns unified activity items
- [x] useNow hook: refreshes timeAgo labels every 30s without re-fetching
- [x] CreatorProfilePage: Change Banner button (Camera icon) appears on hover next to Reposition
- [x] CreatorProfilePage: changeBannerMutation + handleChangeBannerFile wired to profile.uploadBanner
- [x] CreatorProfilePage: AI focal point auto-opens positioner after banner change

## Phase 113: Audio Invariants and State Machine Hardening
- [ ] PlayerContext: add isReady to PlayerState, wire canplay/canplaythrough events
- [ ] PlayerContext: reset duration/currentTime/isReady=false on every track switch (playTrack, nextTrack, prevTrack, addAndPlay, playQueueAt, onEnded)
- [ ] GlobalPlayer: use isReady from context to gate fmtTime display (show 0:00 while not ready)
- [ ] GlobalPlayer: add zone-state lock — if cinematic/EXPANDED mode active, block drag zone transitions
- [ ] MainLayout: add drawer exclusivity guard — handleRailClick dispatches ln:close-right-drawers event
- [ ] PlaylistDrawer: listen for ln:close-right-drawers and close self
- [ ] MarketplaceDrawer: listen for ln:close-right-drawers and close self
- [ ] Singleton audit documented: audioRef confirmed single-instance, PlayerProvider mounted once at app root

## Phase 114: Feel Alive — Transition Quality + Surface Typing

- [x] GlobalPlayer mount audit: confirmed singleton inside persistent MainLayout shell (not remounting per route)
- [x] Optimistic displayTrack: visTrack state mirrors currentTrack but updates immediately on track index change (before isReady fires) — instant visual swap on swipe/skip
- [x] Cinematic ESC key exit channel: window keydown listener active only while cinematic=true
- [x] Loading state: fmtTime returns --:-- when isReady=false (communicates loading, not zero)
- [x] Drawer surface typing audit: KeeperAvatarWidget/FloatingAvatar confirmed as independent assist layer (GuideLayer z:50, not subject to ln:close-right-drawers exclusivity)
- [x] Cinematic portal guard updated to use visTrack (fixes TS18047 null errors)

## Phase 115: Swipe Physics, Visual Persistence, Cinematic Polish, Queue Visualization

- [x] Swipe physics: velocity tracking, momentum carry, rubber-band resistance at track boundaries, spring-back animation
- [x] Player visual persistence: spring-physics cubic-bezier height transitions, will-change during drag, auto-elevate to FLOAT when playback starts in MINI zone
- [x] Cinematic polish: entrance animation (ln-cinematic-enter keyframe), depth layers with parallax background blur, vignette overlay, improved transition timing
- [x] Queue auto-scroll: MiniTrackRow forwardRef, activeRowRef + hasMounted guard, smooth scroll to active row on track change
- [x] ESC key exit for cinematic mode
- [x] --:-- loading indicator (fmtTime returns --:-- when isReady=false)

## Phase 118: Community Bug Fixes (Slimdoggy feedback)

- [ ] Remove FLOAT zone from GlobalPlayer — enforce only mini/expanded/cinematic
- [ ] Fix snap reversion bug: pointerUp sets zone once, no reset after expand
- [ ] Kill double progress bars: render MiniProgress only in mini, FullProgress in expanded/cinematic
- [ ] Fix Profile drawer deep-links: My Works → /profile?tab=works, Collections → /profile?tab=collections
- [ ] Remove redundant Settings and Log Out from Profile drawer section
- [ ] Fix Archive/Witnessed Works naming confusion in ContextDrawer
- [ ] Fix WID copy: change "content has not been altered since registration" to accurate hash-based claim
- [ ] Remove or repurpose tilt interaction (bind to parallax or remove entirely)

## Phase 118: Community Bug Fixes (FLOAT Zone Removal + Naming/Copy Fixes)
- [x] Remove FLOAT zone from GlobalPlayer — SNAP.FLOAT constant removed, SnapZone type updated to "MINI" | "EXPANDED" only, getSnapHeight() simplified, single midpoint threshold in onPointerUp, auto-elevate changed FLOAT→EXPANDED, all isFloat JSX references removed, desktop split-layout FLOAT block collapsed into EXPANDED controls row, expand/collapse buttons updated
- [x] Progress bars audit: two bars confirmed in separate contexts (main player bar, cinematic overlay portal) — no duplication
- [x] Fix Profile drawer deep-links: ContextDrawer "My Works" → /profile?tab=works, "Collections" → /profile?tab=collections
- [x] ProfilePage.tsx: added useSearch() + URLSearchParams to read ?tab= on mount for deep-link support
- [x] Fix Archive/Witnessed Works naming in ContextDrawer and MobileNavDrawer: "LNA — Archive" → "Witness Registry", "My Archive" → "My Works", "Witnessed Works" → "Verified Works"
- [x] Fix WID copy: certificate and modal status pill now say "content hash recorded at time of registration" instead of immutability overstatements
- [ ] Remove or repurpose tilt interaction — deferred to Phase 119
- [ ] Slimdoggy "First Witness" recognition page — reverent, provenance-verified, timestamp-anchored — deferred to Phase 119

## Phase 119: Drawer Layer Architecture Fix + Recently Witnessed

- [x] Audit z-index stack: ContextDrawer (z:300) > LeftRail (z:310) > RightRail (was z:90, in-flow flex child)
- [x] Extract RightRail from flex flow: moved out of <main> flex row, now rendered as fixed-position sibling after player layer
- [x] RightRail: position: fixed, top: 0, right: 0, bottom: 0, z-index: 80 — independent of content area, never shifts when drawer opens
- [x] MainLayout content area: added lg:pr-[300px] to prevent content from rendering under the fixed RightRail
- [x] ContextDrawer (z:300) now definitively wins the z-index war over RightRail (z:80)
- [x] Add "Recently Witnessed" section to RightRail Signals panel — shows 4 most recent registry items sorted by createdAt desc, with cover art, title, artist, and timeAgo timestamp
- [ ] Remove or repurpose tilt interaction — deferred
- [ ] Slimdoggy "First Witness" recognition page — deferred

## Phase 120: Keeper Composition Surface (Guide → Structured Composition)

- [x] Audit existing Keeper/Guide chat surface — found keeper.chat tRPC procedure already supports Suno-format output via lyricsKeywords detection
- [x] Create KeeperComposePage.tsx — full multi-panel composition surface at /keeper-compose:
  - LEFT panel: Mode selector (Guide/Conductor/Witness/Custodian/Archivist) with icons, descriptions, and active mode indicator
  - CENTER panel: Structured lyrics editor — parses LLM output into [STYLE]/[TEMPO]/[KEY] header + labeled section cards with tone/delivery annotations; edit mode (textarea); loading state; empty state
  - RIGHT panel: Emotional Arc — ASCII bar chart (▂▃▄▅▆▇█), visual SVG-style bar chart, anchor term ("Arc"), section dot-matrix intensity display
  - CINEMATIC MODE: full-screen overlay with arc visualization, screenplay-style lyrics scroll, dimmed background, action bar
  - Action buttons: COPY (Suno-ready clipboard), EDIT (toggle textarea), SEND TO PLAYER (workflow toast), REGISTER (WID) (navigate to /upload?prefill=...), SAVE NOTE (keeper.saveNote mutation)
  - Input bar: textarea with Ctrl+Enter shortcut, COMPOSE button, per-mode color theming
- [x] Register /keeper-compose route in App.tsx (lazy import)
- [x] Fix dead /keeper-chat link in KeeperPage.tsx → /keeper-compose
- [x] Add COMPOSE button to KeeperPage header → navigates to /keeper-compose
- [x] Fix MainLayout.tsx Unicode box-drawing chars (═) in JSX comments → plain ASCII (=) to resolve esbuild JSX parse error
- [x] TypeScript: 0 client errors (18 pre-existing server/db.ts errors unchanged)

## Phase 121: Provenance Verified — Full Record Cards

- [x] Audit: Provenance Verified was using songs.trending (no guaranteed WIDs) — switched to witnessRegistry.list (all items guaranteed WID)
- [x] Upgraded Provenance Verified section to full record card layout per design spec:
  - 48x48 artwork thumbnail (Music2 icon fallback)
  - Title (2-line clamp) + CheckCircle2 verified badge
  - Creator handle (@artistHandle or creatorName)
  - WID string in Space Mono monospace (gold, 9px)
  - Media type tags (Audio / Video / Lyrics / Work) derived from hasAudio/hasVideo/hasLyrics/isLyricsOnly
  - Gold card background (rgba(255,215,0,0.03)) + border (rgba(255,215,0,0.08))
  - Hover: background brightens to rgba(255,215,0,0.06) + translateX(2px)
  - Click: navigate to /song/{id}
  - Shield icon added to section header
  - Empty state: "No verified works yet."
- [x] Data source: witnessRegistry.list (limit 3 for provenance, limit 8 for registry/recently witnessed)

## Phase 122: visTrack/displayTrack Desync Fix (HIGH PRIORITY)

- [x] Root cause identified: useEffect([state.currentIdx]) missed track identity changes (queue rebuild at same index, OS media session external triggers)
- [x] Patch 1 — hard-sync guard in visTrack IIFE: if (base?.id !== currentTrack.id) → return currentTrack immediately + schedule setDisplayTrack(currentTrack) via setTimeout(0) to avoid setState-in-render
- [x] Patch 2 — stronger effect dependency: changed from [state.currentIdx] to [currentTrack?.id, state.currentIdx] so any track identity change fires the sync
- [x] Patch 3 — play action audit: playTrack/nextTrack/prevTrack/playQueueAt all update currentIdx which drives the effect — no additional setDisplayTrack calls needed at call sites
- [x] setQueue only seeds empty queues and never changes playing track — no fix needed there

## Phase 123: UX Interaction Bug Fixes (Slimdoggy feedback)
- [x] Fix Collection/playlist ManageTrackRow: non-clickable rows — added Play button (hover-reveal gold circle), playQueueAt from index, addAndPlay fallback, hover gold background, allTracks prop passed at call site
- [x] Fix RightRail Provenance Verified song clicks: changed from navigate(/song/:id) to addAndPlay() quick-play — no navigation, no cinematic escalation; falls back to navigate if no audioUrl
- [x] Fix RightRail Recently Witnessed song clicks: same addAndPlay quick-play pattern
- [x] Root cause confirmed: cinematic was triggered by artwork tap in expanded player (correct behavior), not by RightRail click — the fix is to not navigate to SongDetailPage from RightRail at all

## Phase 124: Keeper Compose Mobile UX Affordances
- [x] Mobile stacked layout: isMobile flag (< 768px), single-column output + input bar replaces three-panel grid
- [x] Mode selector on mobile: icon-only pill row in top bar header, no sidebar
- [x] Thinking state: ThinkingDots component (animated 3-dot pulsing) replaces generic Loader2 + text during generation
- [x] Cinematic icon trigger: Film icon button in input bar (next to Send) opens cinematic mode directly
- [x] Cinematic mode: swipe-down-to-close (> 80px delta), ESC key close, swipe hint chevron on mobile
- [x] Live arc preview: ArcPanel shows derivePreviewArc(prompt) while typing (word-count-based 4-point curve, labeled PREVIEW)
- [x] Arc panel on mobile: collapsible accordion below output area (auto-opens after generation)
- [x] Player auto-collapse: textarea onFocus dispatches ln:player-collapse, onBlur dispatches ln:player-expand
- [x] KeeperAvatarWidget already hidden on /keeper-compose (path starts with /keeper) — page owns its own cinematic trigger

## Phase 125: Activation MVP
- [ ] Schema: add activationEnabled (boolean, default false) to songs table
- [ ] Schema: add totalFundingCents (int, default 0) to songs table
- [ ] Schema: add activationStagesJson (text/JSON, nullable) to songs table
- [ ] Schema: create activationContributions table (id, songId, userId, stageId, amountCents, stripeSessionId, stripePaymentIntentId, createdAt)
- [ ] Migration: generate SQL via pnpm drizzle-kit generate and apply via webdev_execute_sql
- [ ] Server db.ts: add getActivation(songId), recordActivationContribution() helpers
- [ ] Server routers.ts: add activation.getForSong (public), activation.contribute (protected, creates Stripe checkout)
- [ ] Server routers.ts: extend Stripe webhook handler to handle type="activation" metadata
- [ ] Server routers.ts: webhook increments songs.totalFundingCents and records activationContributions row
- [ ] Frontend: build ActivationPanel.tsx component (stage bars, contribute button, funding total)
- [ ] Frontend: mount ActivationPanel on SongDetailPage when activationEnabled=true
- [ ] Frontend: invalidate songs.getById on contribution success so progress updates

## Phase 125: Activation MVP (Stage-Based Funding)
- [x] Schema: added activationEnabled (boolean, default false), totalFundingCents (int, default 0), activationStagesJson (text JSON) to songs table
- [x] Schema: created activationContributions table (id, songId, userId, stageId, amountCents, contributorName, message, anonymous, stripeSessionId, stripePaymentIntentId, createdAt, status)
- [x] Migration: generated SQL (0093_vengeful_...) and applied via Node.js mysql2 script
- [x] DB helpers: getActivationForSong, recordActivationContribution, getActivationContributions, configureSongActivation, verifySongOwnership added to server/db.ts
- [x] tRPC router: activation.getForSong, activation.contribute (Stripe checkout), activation.getContributions, activation.configure added to server/routers.ts
- [x] Stripe webhook: extended checkout.session.completed handler to process type="activation" payments — records contribution, increments totalFundingCents, marks stage.reachedAt when goal is met
- [x] Frontend: ActivationPanel.tsx built — stage progress bars (StageBar), contribute button with preset amounts ($5/$10/$25/$50) and custom input, recent supporters accordion, Stripe redirect
- [x] Frontend: ActivationPanel mounted in SongDetailPage.tsx before lyrics section — only renders when activationEnabled=true
- [x] No real-time: refresh-based (invalidate on Stripe success redirect)

## Phase 126: Build Failure Fix + First Witness Page
- [x] Fix ActivationPanel.tsx build failure: replaced @/hooks/use-toast with sonner toast import
- [x] Wire ln:player-collapse and ln:player-expand events in GlobalPlayer.tsx with mode restore (collapses to MINI, restores previous zone on expand)
- [x] Update WhatsNew to v2.44.0: Keeper Compose — Now Live (Mobile + Cinematic) with 7 items
- [x] Build /first-witness page for Slimdoggy with all 5 sections: Header, Provenance Block, Impact Timeline, Doctrine Quote, Certificate (downloadable PNG via Canvas API)
- [x] Register /first-witness route in App.tsx

## Phase 126: Build Failure Fix + First Witness Page
- [x] Fix ActivationPanel.tsx build failure: replaced @/hooks/use-toast with sonner toast import
- [x] Wire ln:player-collapse and ln:player-expand events in GlobalPlayer.tsx with mode restore
- [x] Update WhatsNew to v2.44.0: Keeper Compose Now Live (Mobile + Cinematic) with 7 items
- [x] Build /first-witness page for Slimdoggy with all 5 sections: Header, Provenance Block, Impact Timeline, Doctrine Quote, Certificate (downloadable PNG via Canvas API)
- [x] Register /first-witness route in App.tsx

## Phase 127: Activation Panel UI Upgrade (Production Spec)
- [x] Rewrite ActivationPanel.tsx with production layout: narrative header (Activate This Work / Creator Commitment: Active), total progress bar anchoring the panel, stage cards with description field (not just bars), 4-button preset grid (5/10/25/50), post-Stripe invalidate + toast, refined CTA button text
- [x] Stage type updated to include description field (mapped from JSON with fallback empty string)
- [x] Standard 4-stage system locked: Witnessed / Build / Produce / Release with goalCents 5000/15000/30000/50000
- [x] Progression system framing enforced: no donation language, all copy reinforces idea to reality arc

## Phase 128: WSP (Witness Surface Player) — Architectural Replacement
- [x] WSPContext.tsx created: WSPMode type (surface/expanded/floating), floatingPosition state, wsp:* custom events (wsp:expand, wsp:collapse, wsp:float, wsp:dock, wsp:track-change)
- [x] WitnessSurfacePlayer.tsx built: Surface mode (56-64px bar under navbar, artwork/title/creator/play), Expanded mode (downward expansion with controls/artwork/identity/actions/waveform), Floating mode (draggable, pointer events, edge-snap, localStorage position)
- [x] MainLayout.tsx updated: WSP injected under Navbar, GlobalPlayer removed from bottom player layer, content area padding adjusted (top instead of bottom)
- [x] WSPProvider added to main.tsx provider tree (inside KeeperAttrsProvider)
- [x] CSS variables set in index.css: --wsp-top (56px mobile / 52px desktop), --wsp-left (0px mobile / 72px desktop), --wsp-height (60px)
- [x] Audio engine confirmed in PlayerContext (new Audio() imperative) — GlobalPlayer removal does not break audio playback
- [x] PlayerContext bridge: usePlayer() inside WSP gives direct access to currentTrack, isPlaying, togglePlay, seek, toggleLike, incrementShare, nextTrack, prevTrack, audioRef
- [x] Deferred: Activation stages visual overlay on WSP artwork
- [x] Deferred: Provenance pulse state on WSP surface bar
- [x] Deferred: Keeper sync context display in WSP
- [ ] Deferred: Scroll-aware cinematic transitions

## Phase 131 — WSP Paradigm Shift: Artwork as Primary Surface

- [x] WSP ExpandedPanel: promote artwork to core surface (increase size ~35%, min 75vw or 380px, centered vertically as primary focal anchor)
- [x] WSP ExpandedPanel: move back/play/next controls INTO the top row (collapse handle row), freeing the center for artwork
- [x] WSP ExpandedPanel: remove the standalone controls row below the collapse handle (controls now live in top row)
- [x] WSP ExpandedPanel: tighten seek bar — keep it but make it thinner and less prominent (2px, low opacity)
- [x] WSP ExpandedPanel: actions row (Like/Comment/Share/Tip/Verify) stays below artwork as secondary row
- [x] WSP ExpandedPanel: provenance + activation section stays below actions row
- [x] WSP ExpandedPanel: artwork reactive glow — on hover/tilt interaction, emit a warm gold radial glow behind artwork
- [ ] WSP ExpandedPanel: activation stage node pulse — when stage threshold is crossed, pulse the stage dot with a green ring animation
- [ ] WSP ExpandedPanel: activation progress reactive glow — subtle gold shimmer on the progress bar when funding changes
- [x] WSP SurfaceBar: make the strip feel like a WSP entry point — add a thin gold left-border accent, slightly warmer background
- [x] KeeperAvatarWidget: fade opacity to 0.35 during active playback (isPlaying=true), restore to 1.0 on pause/stop or hover
- [x] KeeperAvatarWidget: tie fade to PlayerContext isPlaying state via usePlayer() hook

## Phase 131 — WSP Paradigm Shift: Artwork as Primary Surface

- [x] WSP ExpandedPanel: promote artwork to core surface (increase size ~35%, min 75vw or 380px, centered vertically as primary focal anchor)
- [x] WSP ExpandedPanel: move back/play/next controls INTO the top row (collapse handle row), freeing the center for artwork
- [x] WSP ExpandedPanel: remove the standalone controls row below the collapse handle (controls now live in top row)
- [x] WSP ExpandedPanel: tighten seek bar — keep it but make it thinner and less prominent (2px, low opacity)
- [x] WSP ExpandedPanel: actions row (Like/Comment/Share/Tip/Verify) stays below artwork as secondary row
- [x] WSP ExpandedPanel: provenance + activation section stays below actions row
- [x] WSP ExpandedPanel: artwork reactive glow — on hover/tilt interaction, emit a warm gold radial glow behind artwork
- [ ] WSP ExpandedPanel: activation stage node pulse — when stage threshold is crossed, pulse the stage dot with a green ring animation
- [ ] WSP ExpandedPanel: activation progress reactive glow — subtle gold shimmer on the progress bar when funding changes
- [x] WSP SurfaceBar: make the strip feel like a WSP entry point — add a thin gold left-border accent, slightly warmer background
- [x] KeeperAvatarWidget: fade opacity to 0.35 during active playback (isPlaying=true), restore to 1.0 on pause/stop or hover
- [x] KeeperAvatarWidget: tie fade to PlayerContext isPlaying state via usePlayer() hook

## Phase 132 — Work Evidence Layer (Proof Attachment System)

- [x] Create workEvidence table in drizzle/schema.ts (id, songId FK, type enum file/link/note, title, url, metadataJson, addedByUserId FK, createdAt, hash)
- [x] Generate and apply DB migration for workEvidence table
- [x] Add evidence.list tRPC procedure (public, returns evidence for a songId sorted by createdAt desc)
- [x] Add evidence.add tRPC protected procedure (owner-only: validate user owns the song, accept type/title/url/hash)
- [x] Add evidence.delete tRPC protected procedure (owner-only: validate ownership before delete)
- [x] Add S3 upload endpoint for evidence files (server-side storagePut, return url + sha256 hash)
- [x] Song page: add Evidence section below Provenance panel (visible, not behind modal)
- [x] Evidence section: chronological list of evidence items with type icon, title, timestamp, and link
- [x] Evidence section: Add Evidence button (owner-only, opens inline form or sheet)
- [x] Add Evidence form: type selector (File / Link / Note), title input, file upload or URL input
- [x] Evidence item: show computed hash badge when hash is present (chain of custody indicator)
- [x] Evidence section: empty state with call-to-action for owner

## Phase 133 — Contributor Recognition MVP

- [x] Extend activation.getForSong in server/db.ts to return recentContributors (userId, name, image, stageId, amountCents, createdAt) from activationContributions JOIN users, order DESC, limit 15
- [x] Update activation.getForSong tRPC procedure in routers.ts to pass recentContributors through
- [x] Build WitnessStrip component inside ActivationPanel.tsx (horizontal scroll, avatar+name, max 5 visible, +X overflow)
- [x] Build Stage Attribution in ActivationPanel.tsx (show contributor names per stage, max 2 names + +X, only when stage reached)
- [x] Build Contribution Feed accordion in ActivationPanel.tsx (collapsed by default, max 10 items, formatContribution helper)
- [x] Invalidate activation.getForSong after contribution mutation in ActivationPanel.tsx
- [x] Empty state: show Be the first to witness this work when no contributors

## Phase 135 — Critical Bug Fixes + UX Improvements

### 🚨 Critical
- [ ] Fix Register WID: debug button click → API route → auth check → form validation → success path
- [ ] Fix lyrics/chat not persisting: implement auto-save to DB on generation success
- [ ] Add Recent Drafts panel in Keeper Compose showing last 5 generations

### ⚡ High Impact UX
- [ ] Remove extra step in Compose→Cinematic: inline film icon in input bar, auto-enter cinematic after generation
- [ ] Cinematic mode: skip intermediate confirmation, go directly Compose→Generate→Cinematic View

### 🟢 Strategic
- [x] Elevate Conductor visibility: add tooltip on first use, highlight in onboarding modal
- [ ] Add Conductor entry point on Home page / sidebar

## Phase 136 — Navbar Player Integration + What's New v2.45.0

- [x] Embed WSP Surface Mode inline in TopBar (artwork + seek + controls)
- [x] Hide SurfaceBar on desktop (md:hidden)
- [x] Adjust MainLayout desktop content offset to pt-[56px]
- [x] Update WhatsNewModal to v2.45.0 with Phase 135 + 136 additions

## Phase 140 — primaryGenre Validation Fix
- [x] Increase primaryGenre Zod validation from max(64) to max(500) in server/routers.ts (DB column is already text, no migration needed)

## Phase 141 — UI Hierarchy Restructure (No Backend Changes)
### Home / Explore Cards
- [ ] Update card layout to lead with testimony snippet (1–2 lines, from song description/lyricsText)
- [ ] Move artwork/player below testimony snippet
- [ ] Show creator + resonance (reactions + funding) at bottom of card
- [ ] Remove title-first hierarchy from cards
### Song Detail Page
- [ ] Move Testimony (rename from description) to top of page
- [ ] Player (Manifestation) second
- [ ] Resonance Field (aggregate reactions + funding + contributors) third
- [ ] WID block fourth
- [ ] Interaction section (comments, share, contribute) fifth
- [ ] Metadata (tags, AI label) last
- [ ] Replace or demote AI-Generated badge (show as subtle footnote, not prominent badge)

## Phase 141b — Testimony Card Paradigm
- [x] Rebuild StoreTrackCard: testimony text as primary surface over blurred/darkened artwork background, play button below, creator + resonance at bottom
- [x] Rebuild TrackCard: same testimony-first hierarchy, artwork as atmospheric background
- [x] Hover effect: image subtly sharpens, play button brightens, card lifts slightly
- [x] Mobile: same structure, no hover dependency — tap = play or expand
- [x] Restructure SongDetailPage: Testimony (renamed from description) at top, Player second, Resonance Field third, WID fourth, Interaction fifth, Metadata last
- [x] Demote AI-Generated badge to subtle footnote in Metadata section

## Phase 141c — Dual Surface Card Visual Balance
- [x] StoreTrackCard: artwork as full visual base (no heavy dim), bottom gradient only for text readability, testimony as overlay companion
- [x] TrackCard: same — reduce overlay from ~80% to ~40%, artwork vibrant and visible
- [x] SongDetailPage Testimony block: same bottom-gradient-only treatment

## Phase 141d — Final Canonical Dual Surface Card
- [x] StoreTrackCard: exact gradient rgba(0,0,0,0.65)→rgba(0,0,0,0.35)→rgba(0,0,0,0.0) at 0%/40%/80%
- [x] StoreTrackCard: centered 56px gold ring play button with soft glow, hover brighter, playing pulse ring
- [x] StoreTrackCard: testimony max 2 lines, #F5F5F5 at opacity 0.92, bottom overlay
- [x] StoreTrackCard: attribution row bottom-left (creator + WID badge), resonance bottom-right (plays/hearts/funding)
- [x] StoreTrackCard: "NOW PLAYING" badge near resonance when track is active
- [x] TrackCard: same canonical spec applied
- [x] Both cards: hover scale(1.02) on artwork, no blur ever
- [x] pulse-gold keyframe added to index.css for playing state animation

## Phase 142 — Comic System Refactor (Cinematic Guided Reader)
- [x] Build CinematicComicReader component: Single Page mode (default, max-width 1100px, aspect-ratio preserved, smooth transitions)
- [x] CinematicComicReader: Spread Mode toggle (max 2 pages, cinematic double-page)
- [x] CinematicComicReader: Overview Mode (thumbnail grid explorer, not reading default)
- [x] CinematicComicReader: keyboard arrow navigation (← →, Escape to close)
- [x] CinematicComicReader: wheel zoom support with GPU-accelerated transform: translate3d()
- [x] CinematicComicReader: Guided Mode — panel-by-panel progression with zoom/pan animation
- [x] CinematicComicReader: Guided Mode — panel region metadata (JSON bounding boxes per page)
- [x] CinematicComicReader: mobile vertical reader — swipe-down panel/scene progression
- [x] CinematicComicReader: mobile sticky top controls (← Exit, Page #, mode switcher)
- [x] CinematicComicReader: mobile sticky bottom control (Next Panel / Next Page + panel dots)
- [x] CinematicComicReader: double-tap to fullscreen panel
- [x] Restructure BookDetailPage: Origin Testimony as Section 1 (artwork background + testimony text)
- [x] BookDetailPage: Section 2 Reader Access (cinematic hero entry, mode hints, page count badge)
- [x] BookDetailPage: Section 3 Resonance Field (reactions + comments)
- [x] Replace HorizontalBookReader usage with CinematicComicReader in BookDetailPage

## Phase 143 — Adaptive Narrative Reader (Panel-First Mobile + Canvas Zoom)
- [ ] Mobile: default to Guided Panel Mode (one panel per swipe, full readable screen) — remove full-page default on mobile
- [ ] Mobile: swipe right = next panel, swipe left = previous panel, swipe up = next page
- [ ] Mobile: panel dot indicators at bottom showing position within current page
- [ ] Desktop: Single Page default, Spread and Guided as toggles
- [ ] Free canvas zoom/pan: replace linear wheel zoom with pinch-to-zoom + free pan (no axis lock)
- [ ] Momentum physics: natural easing/deceleration after pan gesture ends
- [ ] Smart double-tap: zoom to nearest speech bubble or panel bounding box
- [ ] Two-finger tap: reset to fit-page view
- [ ] Auto-hide UI chrome: controls visible on tap, auto-fade after 3 seconds (Netflix/Kindle pattern)
- [ ] Minimal top bar: Back arrow + Title + Page X of Y + ⋯ menu only — remove dense controls from top
- [ ] Guided Mode: manual-advance by default (tap right = next panel, tap left = previous)
- [ ] Guided Mode: optional autoplay toggle with timing slider (8s default, 5s–15s range)
- [ ] Guided Mode: panel display time shows 6–8s for standard panels, 10–14s for dialogue-heavy
- [ ] Panel data model: panelOrder array with focusArea bounding boxes per page
- [ ] Bottom control bar: PREV · GUIDED MODE · TOGGLE UI · NEXT (minimal, auto-hides)

## Phase 144 — Three Narrative Rendering Engines (Medium-Specific)

### Comic Book Engine (CinematicComicReader upgrade)
- [x] Focus Hold metadata: panel JSON supports `hold: true, recommendedDuration: 14` — autoplay respects this duration instead of global setting
- [x] Reading Style menu in ⋯: Standard / Guided / Spread / Accessibility (replaces mode switcher labels)
- [x] Auto-load correct engine based on Narrative Format field on the work record

### Children's Book Engine (ChildrensBookReader — new component)
- [x] Spread mode as desktop default (open-book framing, visual breathing room)
- [x] Single full page as mobile default (no panel splitting)
- [x] Page-flip animation (warm, soft — not slide)
- [x] Ambient Reading Mode: optional subtle particles, soft page glow, warm UI chrome
- [x] Narration Anchor slots per page: voice clip URL, SFX URL, music cue URL (stored in pagesJson)
- [x] Narration Anchor: auto-play audio on page turn when anchor is present
- [x] Always-visible warm UI chrome (larger tap targets, friendly typography)
- [x] Tap anywhere to advance (no guided panel mode)
- [x] Read Aloud button placeholder (future TTS)

### Manuscript Engine (ManuscriptReader — new component)
- [x] Vertical flowing text layout (not paginated images)
- [x] Reader-selectable typography: Serif / Sans / Mono
- [x] Reader-selectable theme: Sepia / Dark / Paper (white)
- [x] 700–850px readable column, centered
- [x] Focus Mode: hides all chrome, only text visible, ESC to exit
- [x] Ambient audio: optional background (rain / fireplace / silence)
- [x] Resume position: saves scroll position to localStorage per work ID
- [x] Inline Witness Layer anchors (scaffold only — future annotation UI)

### Narrative Format field + routing
- [x] Add `narrativeFormat` enum column to `songs` table: comic | childrens | manuscript (migration applied)
- [x] Migration SQL applied via direct DB connection
- [x] Book upload/edit form: Narrative Format selector (🎭 Comic / 📖 Children's Book / 📄 Illustrated Novel)
- [x] BookDetailPage: auto-routes to correct reader component based on narrativeFormat
- [x] narrativeFormat auto-detected from contentType as fallback — no badge needed

### Witness Layers (scaffold)
- [ ] Data model defined: WitnessAnchor type { anchorType: panel|page|paragraph, anchorId: string, authorId, content, createdAt }
- [ ] Scaffold in shared/types.ts — no UI yet, future phase

## Phase 145 — Creator Studio Workspace + Comic Platform Shift

### Creator Studio Workspace (replaces cramped edit modal)
- [x] Build CreatorStudioPage: full-page tabbed editor at /book/:id/studio
- [x] Tab 1 — Overview: title, testimony, headline caption, genre, cover art, credits JSON
- [x] Tab 2 — Pages: StoryboardBuilder with drag-reorder and panel region tagging
- [x] Tab 3 — Access: readAccess selector, preview page count slider, coming-soon gating features
- [x] Tab 4 — Metadata: mood tags, narrativeFormat selector, AI disclosure
- [x] Tab 5 — Resonance: play/tip/witness stats, coming-soon heatmaps
- [x] Tab 6 — Provenance: WID, timestamps, certificate link, coming-soon lineage
- [x] Live Preview panel: right-side toggleable split-screen, routes to correct reader engine
- [x] Replace Edit Pages + Manage buttons in BookDetailPage with single Creator Studio button
- [x] Commit Revision save button with saving/saved/error states
- [x] Add /book/:id/studio route to App.tsx

### Bug Fixes
- [ ] Fix sidebar z-index overlay conflict: activity rail overlaps modals — add z-index isolation + overflow containment
- [ ] Fix edit modal max-width: increase to 1100px
- [ ] Reader lazy loading: progressive image loading, page virtualization
- [ ] Reader GPU acceleration: ensure all transforms use translate3d()
- [ ] Fullscreen reader: ESC exit, keyboard navigation, immersive background fade

### BookDetailPage Cinematic Refactor
- [ ] Hero section: full cinematic banner with ambient artwork, blurred parallax background, soundtrack integration
- [ ] Hero contains: title, creator, Origin Testimony excerpt, Read Now, Guided Mode, Witness Access CTA
- [ ] Origin Testimony section: creator intent, emotional meaning, inspiration, witness context
- [ ] Manifestation Layer: live comic preview (not static image dump), fullscreen launch, guided mode entry
- [ ] Resonance Field: unified reactions + witness count + contributions + comments in one layer
- [ ] Provenance Block: moved lower (emotion before registry)
- [ ] Related Universe: large cinematic cards (related creators, connected comics, soundtrack artifacts)

## Phase 146 — Provenance-First Manifestation Ecosystem Reinvention

### Global Terminology
- [x] Replace all "AI-Generated" text with "AI-Assisted Manifestation" across AiDisclosurePill, VersionHistoryModal, and all other references
- [x] AI disclosure badge: never primary, subdued styling, metadata-only positioning
- [x] Human testimony always prioritized above AI metadata in all layouts

### Global Player Fix (Desktop)
- [x] WitnessSurfacePlayer ExpandedPanel: mobile-only guard added (GlobalPlayer handles desktop)
- [x] Single canonical player on desktop — no duplicate bottom strip

### Mobile Song Page Improvements
- [x] Sticky manifestation header: artwork + title + creator + controls, collapses on scroll (md:hidden)
- [x] Testimony formatting: larger line spacing, cinematic quote style with left border accent
- [x] Floating resonance bar at bottom: resonate / support / witness / share / contribute

### Creator Economy Expansion
- [x] Add cashAppHandle, paypalUsername, venmoHandle columns to users table (migration applied)
- [x] Add donation link fields to updateProfile procedure in routers.ts
- [x] DirectSupportEditor component on ProfilePage (edit + display modes)
- [x] Visitor view: Cash App / PayPal / Venmo link pills on profile

### Identity Card Reinvention
- [x] QRIdentityCard rewritten as ceremonial collectible card
- [x] Rarity class system: Genesis / Witnessed / Resonant / Standard (auto-computed from resonance data)
- [x] Rarity-colored border gradient, ambient glow, rarity badge top-right
- [x] Resonance signature row: plays · witnesses · contributions
- [x] Creator seal: "WITNESSED ON LIVING NEXUS · PROVENANCE PRESERVED"
- [x] QR code with rarity-colored gold border
- [x] Bottom provenance strip with date
- [x] "Minting Card…" loading state
- [x] Rarity indicator above card preview in modal


## Phase 147 — Guided Manifestation Reader

- [ ] Panel region data structure: add panelRegions JSON column to songs table
- [ ] DB migration: panelRegions column on songs table
- [ ] CinematicComicReader: Guided Mode as true primary mode (panel-by-panel cinematic zoom/pan GPU-accelerated)
- [ ] CinematicComicReader: smooth easing transitions between panels (no harsh snapping)
- [x] CinematicComicReader: desktop keyboard navigation (arrow keys, wheel progression)
- [x] CinematicComicReader: mobile tap-to-advance and vertical swipe momentum
- [ ] CinematicComicReader: auto-dialogue focus (speech bubble enlargement/sharpening)
- [x] CinematicComicReader: sticky reader controls top/bottom
- [x] CinematicComicReader: fullscreen immersive mode (ESC, cinematic fade, hidden chrome, notch safe area)
- [x] CinematicComicReader: lazy loading nearby pages only
- [ ] CinematicComicReader: progressive resolution (low-res preview to HD focus region to full-res)
- [x] CinematicComicReader: Overview mode thumbnail explorer ONLY
- [x] Soundtrack sync cue mapping: soundtrackCues JSON column (page/region/trackId/startTime)
- [x] Witness Access gating: free = preview + standard + low-res; Witness = guided + HD + soundtrack + commentary
- [x] Creator Commentary system: tap-panel overlay with scene meaning/lore/testimony/soundtrack notes
- [ ] Resonance layer architecture: per-panel reactions and witness notes (data model Phase 147)

## Phase 148 — Manifestation Studio Upgrade

- [ ] CreatorStudioPage: add Derivatives tab (remixes, reinterpretations, alternate editions, creator agreements)
- [ ] CreatorStudioPage: add Version History tab (snapshots, who/what/when/why, rollback, revision testimony)
- [x] CreatorStudioPage: Pages tab focus region editor (drag boxes, reading order, pacing, transition type, emotional beats)
- [x] CreatorStudioPage: Pages tab soundtrack anchor UI (attach tracks to pages/scenes/focus regions)
- [x] CreatorStudioPage: Live Preview desktop/mobile/fullscreen/guided mode switcher
- [ ] CreatorStudioPage: Creator Support Surface tab (support links, QR, storefront, resonance funding, contributor payouts)
- [ ] CreatorStudioPage: Artifact Editions section (standard/witness/founder/signed/timestamped UI scaffold)
- [ ] CreatorStudioPage: unsaved changes detection + autosave support
- [ ] CreatorStudioPage: optimistic UI updates on save
- [ ] CreatorStudioPage: cinematic spacing/immersive layout (not admin dashboard feeling)
- [ ] Route /song/:id/studio added to App.tsx
- [x] Panel region editor: drag focus boxes on page image with type (panel/dialogue/narration/splash/reveal/cinematic)
- [x] Panel region editor: reading order numbering
- [x] Panel region editor: transition type per region (fade/zoom/pan/cut)
- [x] Panel region editor: emotional beat markers per region

## Phase 149 — Manifestation-First Experience Refactor

- [x] Song page: dominant PLAY NOW CTA hero with active player state indicator
- [x] Song page: live waveform canvas visualization integrated into player section
- [x] Song page: testimony excerpt surfaced in hero (headlineCaption + description)
- [x] Song page: resonance activity (recent tips + reactions) surfaced near playback
- [x] Comic/Book page: reader-first architecture — reader launches immediately on card click
- [x] Comic/Book page: READ NOW / ENTER STORY CTA as primary hero action
- [x] Comic/Book page: metadata becomes secondary (below reader entry)
- [x] Rename Evidence section to Witnessed Work / Provenance Layer
- [x] Reorder SongDetailPage hierarchy: Manifestation → Resonance → Provenance → Commerce
- [x] Rename RightRail Provenance Verified to Connected Manifestations
- [x] BookCard: clicking card launches reader immediately (not detail page first)
- [x] ExplorePage comic cards: clicking launches reader immediately

## Phase 150 — Guide Entity Upload Pipeline

- [ ] DB: guides table (id, creatorId, canonicalName, archetypeType, role, alignment, domain, testimony, loreDescription, provenanceSheetUrl, artworkUrl, extractedImagesJson, symbolsJson, widCode, canonicalStatus, rightsJson, revenueCreatorPct, derivativePermissions, stripeConnectId, publishedAt, createdAt)
- [ ] DB: migration generated and applied
- [ ] Server: getGuideById, createGuide, updateGuide, publishGuide DB helpers
- [ ] Server: guides.create tRPC procedure (protectedProcedure)
- [ ] Server: guides.extractFromSheet tRPC procedure (Gemini AI extraction from uploaded file URL)
- [ ] Server: guides.update tRPC procedure (update fields, rights, permissions)
- [ ] Server: guides.publish tRPC procedure (set canonicalStatus=published, generate WID)
- [ ] Server: guides.getById tRPC procedure (public)
- [ ] Server: guides.listByCreator tRPC procedure
- [ ] UI: /upload-guide route — 6-step wizard page
- [ ] UI: Step 1 — Upload Provenance Sheet (drag-drop, file list, uploaded preview)
- [ ] UI: Step 2 — Extract & Preview (AI extraction display, extracted images grid, Continue to Review)
- [ ] UI: Step 3 — Review & Confirm (editable guide details, description, symbols & iconography)
- [ ] UI: Step 4 — Rights & Permissions (rights settings checkboxes, revenue split, canonical protections toggles)
- [ ] UI: Step 5 — Connect Creator (Stripe Connect OAuth, payout summary, creator profile display)
- [ ] UI: Step 6 — Publish Guide (publish preview, public URL, what's next checklist, Publish Guide button)
- [ ] UI: Step indicator bar (horizontal numbered steps with arrows, gold active state)
- [ ] UI: Bottom info bar (How the System Works, Derivative Example Flow, Built on Provenance)
- [ ] UI: Canonical Guide page at /guide/:widCode
- [ ] Navigation: Add Upload Guide entry to creator nav
- [ ] Tests: guides.create, guides.extractFromSheet, guides.publish vitest coverage

## Phase 151 — Manifestation-First Floating Dock
- [x] WitnessSurfacePlayer SurfaceBar: transform from top-anchored full-width strip to bottom-floating glass capsule (bottom: 72px above mobile nav, width: min(360px, calc(100vw - 24px)), borderRadius: 32, glass morphism, gold border)
- [x] WitnessSurfacePlayer ExpandedPanel: change top from calc(var(--wsp-top) + 60px) to top: 0 for true full-viewport atmospheric takeover
- [x] WitnessSurfacePlayer ExpandedPanel: add testimony excerpt above artwork for manifestation-first hierarchy
- [x] WitnessSurfacePlayer ExpandedPanel: add prominent manifestation CTA (READ NOW / ENTER GUIDE) below song identity
- [x] WitnessSurfacePlayer SurfaceBar: add compact manifestation CTA (READ NOW / ENTER GUIDE) in capsule row
- [x] MainLayout: change mobile top padding from pt-[116px] to pt-[56px] (SurfaceBar no longer top-anchored)
- [x] MainLayout: restore GlobalPlayer rendering in player layer
- [x] GlobalPlayer MINI bar: add READ NOW CTA for comic/manuscript contentType
- [x] GlobalPlayer MINI bar: add ENTER GUIDE CTA for guide contentType
- [x] PlayerContext Track interface: add testimony field for manifestation-first display
- [x] 201/201 tests passing

## Phase 151 — Manifestation-First Floating Dock
- [x] WitnessSurfacePlayer SurfaceBar: transform from top-anchored strip to bottom-floating glass capsule (bottom: 72px, width: min(360px, calc(100vw - 24px)), borderRadius: 32, glass morphism)
- [x] WitnessSurfacePlayer ExpandedPanel: top: 0 for true full-viewport atmospheric takeover
- [x] WitnessSurfacePlayer ExpandedPanel: testimony excerpt above artwork, manifestation CTA below identity
- [x] WitnessSurfacePlayer SurfaceBar: compact READ NOW / ENTER GUIDE CTA in capsule row
- [x] MainLayout: mobile top padding pt-[116px] -> pt-[56px] (SurfaceBar no longer top-anchored)
- [x] MainLayout: GlobalPlayer restored to player layer
- [x] GlobalPlayer MINI bar: READ NOW CTA for comic/manuscript, ENTER GUIDE for guide contentType
- [x] PlayerContext Track interface: testimony field added
- [x] 201/201 tests passing

## Phase 148 — Archive Routing Fix + Contextual Right Pane Suppression
- [ ] Fix: Register /archive/mine as alias to /archive (ArchivePage) in App.tsx
- [ ] Fix: Register /archive/ledger as alias to /witness-registry in App.tsx
- [ ] Fix: Register /archive?filter=witnessed as handled by ArchivePage with filter param
- [ ] Fix: Update ContextDrawer archive section links to use correct registered routes
- [ ] Fix: Update MobileNavDrawer archive section links to use correct registered routes
- [ ] Improve: ArchivePage empty state — atmospheric message (No manifestations archived yet. Begin witnessing creation.)
- [ ] Phase 148A: RightRail contextual suppression — hide on /upload, /batch-upload, /dashboard, /profile, /settings, /book/:id/studio, /keeper-compose, /admin/*
- [ ] Phase 148A: MainLayout — remove lg:pr-[300px] on editing routes (no right rail = full-width content)
- [ ] Phase 148B: RightRail responsive — already hidden on mobile (hidden lg:flex), verify tablet behavior

## Mobile Phase 1 — App Shell (COMPLETE — 2026-05-26)
- [x] 5-tab navigation (Discover, Profile, Witness, Studio, You)
- [x] Discover screen — light divine theme, featured creator, new witnesses, trending works
- [x] Creator Profile screen — dark sanctuary theme, tabs, mini audio player
- [x] Witness screen — dark sanctuary theme, 3-step ceremony flow UI
- [x] Studio screen — dark sanctuary theme, LAMININ arms, works list, quick actions
- [x] You screen — dark sanctuary theme, WID identity, settings, doctrine arms
- [x] WID Badge component (sm/md/lg, verified state)
- [x] Creator Card component (featured, compact, row variants)
- [x] Hamburger Menu drawer with LAMININ arm navigation
- [x] Quick Reference Slider (left-side, all screens)
- [x] Mini Audio Player component
- [x] Mock data file (5 creators, 5 works, 5 witnesses, 6 quick-ref items)
- [x] Dual divine theme (light public / dark sanctuary)
- [x] TypeScript: 0 errors
- [x] Unit tests: 13 passing

## Mobile Phase 2 — Database Wiring
- [ ] Configure EXPO_PUBLIC_API_URL env var (production API endpoint)
- [ ] Replace MOCK_CREATORS on Discover with trpc.profile.discover
- [ ] Replace MOCK_WORKS on Discover with trpc.songs.discover
- [ ] Replace MOCK_WITNESSES on Witness with trpc.wids.getByCreator
- [ ] Wire Creator Profile to trpc.profile.getByHandle
- [ ] Wire Studio works list to trpc.songs.getMine
- [ ] Wire You screen identity to trpc.auth.me
- [ ] Add loading states and error boundaries to all screens
- [ ] Add pull-to-refresh on Discover and Witness screens

## Mobile Phase 3 — WID Registration Ceremony
- [ ] WID Registration modal/sheet (triggered from Witness screen)
- [ ] Step 1 — Intake: title, medium selector, description, optional file
- [ ] Step 2 — Processing: animated machine state (hashing → signing → minting)
- [ ] Step 3 — Discharge: WID result card, share sheet, Claim Your WID CTA
- [ ] Wire to trpc.wids.create backend procedure
- [ ] Generate and display WID certificate (shareable image)
- [ ] Add WID to Studio works list after registration (optimistic update)
- [ ] Haptic feedback at each ceremony step (Medium on sign, Success on mint)

## Mobile Phase 4 — Authentication
- [ ] Manus OAuth login flow via expo-web-browser
- [ ] Persist auth token with expo-secure-store
- [ ] Gate Studio and You screens behind auth
- [ ] Show public-only Discover and Profile without auth
- [ ] Add Sign In CTA to Discover screen for unauthenticated users
- [ ] Wire theme toggle (Sanctuary Mode) to ThemeProvider

## Mobile Phase 5 — Community Features
- [ ] Witness feed — real-time new WID registrations (polling or WebSocket)
- [ ] Follow / unfollow creators (trpc.profile.follow)
- [ ] Creator search by name, handle, WID
- [ ] Signals feed — creator activity stream
- [ ] Guild membership display on Creator Profile
- [ ] Listen Together — join a room from mobile

## Mobile Phase 6 — Commerce Layer
- [ ] Fan gift / tip flow (Stripe Payment Sheet via @stripe/stripe-react-native)
- [ ] Sync license purchase from work detail screen
- [ ] Creator earnings summary on Studio screen (trpc.stripe.getEarnings)
- [ ] Stripe Connect onboarding from mobile (expo-web-browser)
- [ ] Gift-to-download flow

## Mobile Phase 7 — Keeper AI Agent
- [ ] Floating Keeper orb on Studio and Profile screens
- [ ] Keeper chat panel (slide-up sheet)
- [ ] Voice input via expo-audio microphone (push-to-talk, Whisper)
- [ ] Now Playing context passed to Keeper
- [ ] Keeper mode ring (Guide / Conductor / Critic / Custodian)
- [ ] Keeper skin slot (creator-customizable avatar)

## Mobile Phase 8 — Native Polish
- [ ] Push notifications for new witnesses (expo-notifications)
- [ ] Offline mode — cache last-seen Discover feed
- [ ] Deep links — ln://wid/:widId opens work detail
- [ ] Share sheet — share WID as image card (expo-sharing)
- [ ] Haptic feedback audit — all primary actions covered
- [ ] Animated tab transitions (react-native-reanimated)
- [ ] Biometric lock for Studio screen (expo-local-authentication)

## Mobile Phase 9 — Guide Entity
- [ ] Guide upload intake — file picker + metadata (expo-document-picker)
- [ ] Guide detail view — page-by-page comic/manuscript reader
- [ ] Cinematic reader mode — full-screen immersive
- [ ] Guide WID display and share

## Mobile Phase 10 — App Store Submission
- [ ] Generate production APK / IPA via Expo EAS Build (use Publish button in Manus UI)
- [ ] App Store Connect submission (iOS) — requires Apple Developer account
- [ ] Google Play Console submission (Android)
- [ ] App Store screenshots (6.5" iPhone, 12.9" iPad — 5 screens minimum)
- [ ] Privacy policy URL
- [ ] App Store description copy (doctrine-aligned, creator-focused)

## Phase 170: Fix 301 Redirect Loop on manus.space Domains
- [x] Diagnose 301 redirect to dead Cloud Run URL (bkcyijvkio-vken4u2oeq-ue.a.run.app)
- [x] Root cause: www redirect in server/_core/index.ts applied to ALL domains including *.manus.space
- [x] Fix: Only enforce www redirect for livingnexus.org and bddtpublishing.com canonical domains

## Phase 171: Re-apply Fixes Lost in Rollback (Phases 168+169)
- [x] Download route: stream with Content-Disposition attachment instead of S3 redirect
- [x] Lyrics-only audio attach: skip slot check when upgrading lyrics-only work to audio
- [x] replaceAudioFile: also set isLyricsOnly=false and contentType=audio on attach
- [x] Creator handles in StoreTrackCard: show @handle when available
- [x] Creator handles in LargeManifestationCard: show @handle when available
- [x] Creator handles in MediumManifestationCard: show @handle when available
- [x] Creator handles in MicroManifestationCard: show @handle when available

## Phase 172: Player Bug Fixes (Discord Report)
- [x] Fix: Progress bar click/seek not working (expanded + mini player)
- [x] Fix: Previous track jumps to wrong track (queue ordering)
- [x] Fix: Next track button not advancing
- [x] Fix: Progress bar stops updating after first song
- [x] Fix: Auto-advance not triggering when song ends
- [x] Fix: Archive play button not playing the song

## Phase 174: Mobile Player Nebula & Crystal Redesign
- [x] Fix NaNNaNNaN duration display (guard against NaN/Infinity in formatTime)
- [x] Fix mobile play button too small (increase touch target size)
- [x] Redesign mobile player with Nebula & Crystal style: deep space bg, crystal beveled frame, nebula glow
- [x] Crystal orb play button (large, centered, with nebula interior and gold ring)
- [x] Purple/gold color palette (#9B5CFF nebula purple, #C084FC crystal violet, #D4AF37 nexus gold)
- [x] Crystal progress slider with diamond-shaped thumb
- [x] Track info: large serif/display font in gold/cream, smaller gold artist, small-caps purple subtitle
- [x] Secondary controls row (equalizer, like, shield, waves, fullscreen)
- [x] Crystal corner accents on album art container
- [x] WID badge on album art (gold outline)

## Phase 175: Nebula & Crystal Redesign Applied to Correct Mobile Component (GlobalPlayer)
- [x] Identified MobilePlayerPanel was orphaned — GlobalPlayer is the actual mobile player
- [x] GLASS_BG_MOBILE: deep space nebula gradient (#0a0415 → #0d0520 → #060212)
- [x] GOLD_SHADOW_MOBILE: nebula purple upward glow
- [x] Mobile drag handle: nebula purple with glow
- [x] Mini bar artist text: crystal violet on mobile
- [x] Mini bar play button: crystal orb (purple playing, gold paused) on mobile
- [x] Mini bar next/expand: crystal violet on mobile
- [x] Progress bar: nebula gradient fill, crystal knob glow, crystal time labels on mobile
- [x] Expanded play button: 64px crystal orb on mobile
- [x] Expanded shuffle/prev/next/repeat: crystal violet on mobile
- [x] Utility buttons (comments, add, tip, volume, glow, cinematic, collapse): crystal violet on mobile
- [x] Artwork frame: nebula purple glow and border on mobile
- [x] Track artist/subtitle/provenance: crystal/nebula purple on mobile
- [x] Action row, provenance strip, speed button, Up Next: crystal/nebula on mobile
- [x] TypeScript: 0 errors | Tests: 237/237 pass

## Phase 176: Playback Continuity — Immutable Queue Snapshot
- [x] Add queueId (UUID), sourceType, sourceRef fields to PlayerState
- [x] prevTrack: if currentTime > 3s restart current track; else go to previous
- [x] playQueueAt: freeze queue as immutable snapshot, rotate queueId on each call
- [x] addAndPlay: start a new single-track session (rotate queueId), do NOT merge into existing queue
- [x] setQueue: guard by queueId not just tracks.length to prevent overwrite
- [x] Expose queueId in PlayerContextValue
- [x] nextTrack/onEnded: navigate strictly within the frozen snapshot (no re-fetch)
- [x] Persist queueId to sessionStorage alongside tracks
- [x] TypeScript: 0 errors | Tests: 237/237 pass

## Phase 177: Fix Stale Draft Banner in Archive
- [x] Add tRPC procedure songs.dismissDrafts to bulk-delete or publish stale Draft songs
- [x] Add "Dismiss" (X) button to the draft continuation banner in ArchivePage
- [x] Add "Clear all drafts" option when there are multiple drafts
- [x] TypeScript: 0 errors | Tests: 237/237 pass

## Phase 178: Full Nebula & Crystal Player Spec Implementation
- [x] Crystal orb play button: faceted octagon outer ring (SVG), 4 interaction states (default/pressed/playing/disabled)
- [x] Diamond-shaped progress bar knob (rotated square) with crystal glow
- [x] Inline horizontal volume slider with crystal diamond knob (replace popup on mobile)
- [x] Crystal beveled album art frame with corner crystal accents and inner glow
- [x] Centered controls row layout with equal spacing and larger touch targets (min 44x44px)
- [x] Apply crystal orb play button to desktop PlayerBar
- [x] TypeScript: 0 errors | Tests: 237/237 pass

## Phase 179: Fix Mobile Player Layout Issues
- [x] Shrink play button to 64px (was rendering ~140px due to SVG ring overflow) — already 72px container, SVG fills it correctly
- [x] Fix section order: album art → track info → progress bar → controls (top to bottom) — already correct
- [x] Fix volume slider cut off at bottom — clamped popup position + maxHeight guard added
- [x] Ensure mini bar play button is also correctly sized — w-9 h-9 (36px), correct
- [x] TypeScript: 0 errors | Tests: 237/237 pass

## Phase 180: Download Route Timeout Fix + Track Title Editing

- [x] Increase download route fetch timeout from 25s to 45s (handles slow CDN cold-cache)
- [x] Add retry logic (1 retry with 1s pause) to fetchBytes() before giving up
- [x] Batch download: skip failed tracks instead of aborting entire ZIP
- [x] CDN fallback redirect: set Content-Disposition header so browser downloads instead of opening inline
- [x] Add title state to EditTrackPanel.tsx (pre-populated with song.title)
- [x] Add Track Title input field at top of EditTrackPanel form (above Cover Art)
- [x] Wire title field to songs.updateMetadata mutation payload
- [x] Add WID-immutability note under title field: "Renaming does not change the Witness ID"
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
## Phase 181: Batch Download Parallel Fetch + Comics/Novels Filter Fix
- [x] Batch archive download: rewrite sequential fetch loop to parallel Promise.all — fixes Cloud Run 60s timeout (10 tracks × 45s sequential = 450s worst case, now ~45s max)
- [x] Add "written" virtual contentType to getPublicSongs, getTrendingWorks, getNewThisWeek — OR(manuscript, comic) condition
- [x] Update tRPC router discover/trending/newThisWeek to accept "written" in contentType enum
- [x] Fix ExplorePage: Comics & Novels tab now sends "written" (was "manuscript"), so both comics and manuscripts appear
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
## Phase 182: Typography System Overhaul
- [x] Add type scale CSS variables to :root (--text-xs through --text-h1, --leading-*, --weight-*, --tracking-*, --space-*)
- [x] Update @layer base: body font-size to 16px (var(--text-base)), line-height 1.7, weight 450
- [x] Rewrite h1-h4 base styles using type scale variables (Cinzel h1/h2, Cormorant h3/h4, DM Sans h5/h6)
- [x] Add semantic utility classes: .type-body, .type-ui, .type-caption, .type-overline, .type-h1 through .type-h4
- [x] Update .museum-section-title, .museum-section-header, .museum-caption to reference variables
- [x] Add global minimum font-size floor: text-[7px]/[8px]/[9px]/[10px] all bumped to var(--text-xs) = 11px
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 183: Typography Migration & Explore Density
- [x] Migrate TrackCard genre chips, WID badge, testimony, like count to semantic tokens
- [x] Migrate StoreTrackCard artist name, WID, resonance stats, NOW PLAYING badge
- [x] Migrate ArchivePage WID monospace spans to text-[11px]
- [x] Migrate DashboardPage stat delta chips, activity badge, cover overlay labels, archive batch WID, WID cache labels
- [x] Migrate CreatorProfilePage FeaturedCard WID/AI-OFF/title/genre, SongRow WID badge
- [x] Migrate ExploreCard hot badge, WID badge, title, artist row, content-type chip, genre chips, like count
- [x] Increase ExploreCard info panel padding and genre chip spacing for mobile readability

## Phase 184: Signal Icon + ErrorBoundary Fixes
- [x] Fix mobile Bell icon: was opening What's New modal, now navigates to /notifications
- [x] Upgrade ErrorBoundary: auto-resets on route change (resetKey=location), adds Try Again button alongside Reload, adds inline variant for section-level errors
- [x] Scope ErrorBoundary inside MainLayout so nav/header survive page-level errors
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 185: Lyrics in Downloads
- [x] Embed lyricsText as USLT ID3 tag in single-track download
- [x] Include lyrics.txt in single-track ZIP when lyrics exist
- [x] Embed lyricsText as USLT ID3 tag in batch archive download
- [x] Include per-track lyrics.txt in batch archive ZIP

## Phase 186: ID3 Metadata Auto-Populate on Upload
- [x] Create useAudioMetadata hook (music-metadata parseBlob, extracts title/album/genre/lyrics/cover art)
- [x] Wire hook into UploadPage — auto-populates fields on audio file drop or browse
- [x] Wire hook into BatchUploadPage — auto-populates per-card title/genre/cover art on each file select
## Phase 187: Unpublished Draft UX Fix
- [x] Fix Archive banner label: "Unfinished Manifestation" → "Unpublished Draft"
- [x] Fix Continue button routing: now routes to /upload?editId={song.id}&type={draftType} instead of blank /upload?type=audio
- [x] Add songs.getMyDraft protected tRPC procedure — fetches creator's own song by ID regardless of publish status
- [x] Wire editId URL param into UploadPage — reads ?editId=, calls getMyDraft, hydrates all form fields from draft data
- [x] Add "Continuing Unpublished Draft" banner in UploadPage when editId is present
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
## Phase 188: Left Pane Navigation Cleanup
- [x] ContextDrawer: Remove duplicate Guide Character links (keep one /guides/upload)
- [x] ContextDrawer: Remove duplicate Prompt Studio links (keep /keeper-compose only)
- [x] ContextDrawer: Remove /upload/drafts and /upload/history dead links (redirect aliases)
- [x] ContextDrawer: Remove duplicate Draft Works / Upload History links in upload panel
- [x] ContextDrawer: Collapse archive panel Registry section (3 links → 1 to /witness-registry)
- [x] ContextDrawer: Fix home panel /#founders-era hash link → /founder-era real route
- [x] ContextDrawer: Add Dashboard link to profile panel (logical home for creator tools)
- [x] MobileNavDrawer: Remove duplicate Draft Works / Upload History (both → /archive)
- [x] MobileNavDrawer: Collapse Registry section (3 links → 1 to /witness-registry)
- [x] MobileNavDrawer: Mirror clean structure from ContextDrawer
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
## Phase 189: Global UI/UX Refactor — True-Black Theme & Typography Enhancement
- [x] index.css: Replace #111009/#1C1A14 surface tokens with true-black palette (#000000/#0A0A0A/#111111/#1A1A1A)
- [x] index.css: Add -webkit-font-smoothing: antialiased and font-smoothing to body
- [x] index.css: Update Cormorant Garamond Google Font import (add weights 400/500/600/700 italic)
- [x] index.css: Tighten type scale — increase letter-spacing on h1/h2, refine line-heights
- [x] index.css: Update .cosmic-bg, .museum-pan-wrapper fade gradients, .sg-divider-wide-center bg to true-black
- [x] index.css: Update html/body background-color hardcoded value to #000000
- [x] index.css: Update [data-theme="dark"] tokens to match new true-black palette
- [x] MainLayout.tsx: Replace bg-[#111009] with bg-background; update --ln-coal mobile header token
- [x] TopBar.tsx: Replace rgba(10,8,6,0.97) NAV_BG with rgba(0,0,0,0.97); fix fontFamily Inter → DM Sans
- [x] ContextDrawer.tsx: Audit and replace any hard-coded #111009 surface values
- [x] MobileNavDrawer.tsx: Audit and replace any hard-coded surface values
- [x] ContextualModal.tsx: Replace bg-[#111009] with bg-background semantic token
- [x] LeftRail.tsx: Audit hard-coded background values for true-black alignment
- [x] All pages (25+ files): bulk-replaced all remaining #111009/#1C1A14/rgba(10,x,x) background values
- [x] All components (15+ files): TrackCard, StoreTrackCard, BookCard, GlobalPlayer, PlayerBar, TheaterPlayer, GiftModal, TipModal, TosAcceptanceModal, WelcomeModal, WhatsNewModal, IdentityEditor, EditTrackPanel, ManifestationBundle, FeaturedProjectsCarousel, AddToPlaylistButton, RightRail, QuickRefSlider
- [x] cardTokens.ts: CARD_BG_COLOR updated to #000000
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 190: Playlist Management System
- [x] Build AddToNamedPlaylistPopover component: dropdown showing all user playlists + one-click add + "New Playlist" shortcut
- [x] Add playlists.songInPlaylists tRPC procedure: returns which of user's playlists contain a given song
- [x] Upgrade PlaylistsPage: inline song search/add bar (globalSearch), per-row play button, improved empty state
- [x] Fix PlaylistsPage track row: show creator artistHandle/name instead of raw userId
- [x] Fix PlaylistsPage Play All button styling → gold
- [x] Wire AddToNamedPlaylistPopover into SongDetailPage action bar
- [x] Wire AddToNamedPlaylistPopover into ArchivePage track row actions (published songs only)
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 191: Collections & Playlists Discoverability
- [x] ArchivePage: Rename "My Lists" tab → "Collections & Playlists", move to 2nd position (before External)
- [x] ArchivePage: Add CollectionsSection (batch upload albums) above MyListsTab in the combined tab
- [x] ArchivePage: CollectionsSection has expand/collapse, Play All, per-track view, empty state with Register Work CTA
- [x] ProfilePage: Move "Collections" tab to 2nd position (right after Overview), renamed to "Collections & Playlists"
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 192: Track Display Order Persistence
- [x] db.ts: Add getNextDisplayOrder(userId) helper — returns MAX(displayOrder)+1 for a creator
- [x] db.ts: Update createSong to accept optional displayOrder param
- [x] routers.ts: songs.upload mutation — set displayOrder to getNextDisplayOrder() before insert
- [x] routers.ts: songs.batchUpload mutation — get starting slot before loop, pass batchDisplayOrder++ to each createSong
- [x] Verified: getPublicSongs already sorts by displayOrder when creatorId is present (db.ts line ~401)
- [x] Verified: getCreator procedure uses getSongsByUser which already sorts by displayOrder ASC, createdAt ASC
- [x] Verified: ArchivePage already has full drag-to-reorder with grip handles wired to songs.reorder mutation
- [x] Verified: Global discover/home feeds intentionally sort by recency (correct behavior for discovery)
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 193: Creator Domain Engine
- [x] Schema: Add domainBlocks table (userId, blockType, position, config JSON, visible, size, createdAt, updatedAt)
- [x] Schema: Add domainVersions table (userId, versionNumber, layoutSnapshot JSON, changeNote, createdAt) — provenance of domain changes
- [x] DB: pnpm db:push — both tables migrated to TiDB successfully
- [x] shared/domainTypes.ts: DomainBlockType (16 types), DomainBlockSize, DomainBlockRecord, ShelfBlockConfig, FeaturedWorkBlockConfig, DEFAULT_DOMAIN_LAYOUT
- [x] server/db.ts: getDomainBlocks, saveDomainLayout, getDomainVersions, getNextDomainVersion helpers
- [x] server/routers.ts: domain router — getLayout (public), saveLayout (protected, creates version), getVersionHistory (protected), getPublicVersionHistory (public)
- [x] ShelfBlock.tsx: Visual shelf for Music/Books/Comics/Manuscripts/Artifacts/Merch — horizontal scroll rack with cover art, play, WID badge, empty state
- [x] DomainRenderer.tsx: Renders 16 block types in creator-defined order; fetches own data; handles empty state with onboarding prompt
- [x] DomainEditor.tsx: Drag-drop reorder (mouse/touch), show/hide toggle, size selector (sm/md/lg/full), add/remove blocks, save with provenance versioning, version history timeline panel
- [x] CreatorProfilePage.tsx: DomainRenderer rendered above Projects section; "Edit Domain" toggle button (owner only); DomainEditor panel slides in
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 193.5: Trust Restoration
- [x] Fix TopBar guide autocomplete links: /guides/${id} → /guide/${id} (singular route)
- [x] Fix /settings route: add redirect to /settings/billing (was 404)
- [x] Fix duplicate /archive/mine and /archive/ledger routes in App.tsx
- [x] Fix ExplorePage deep links: /explore?medium=music, ?sort=new, ?sort=trending now drive page state (useSearch + useEffect sync)
- [x] Audit Creator Identity path: create/edit/view/QR/card — intact
- [x] Audit Manifestation path: upload/WID display/edit/archive/restore/delete — intact
- [x] Audit Archive path: tracks/collections/drafts/delete — intact
- [x] Audit Domain path: view/edit/save/version history (domainBlocks + domainVersions tables confirmed migrated) — intact
- [x] Audit QR path: generate/scan/log/deep-link (qrRouter confirmed) — intact
- [x] Audit Discovery path: Home/Explore/Search/Shelf — intact (deep links now fixed)
- [x] Audit Playback path: expand/collapse/floating/queue — intact
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
- [x] Save LN-ADP v1 to references/LN-ADP-v1.md
- [x] Add LN-ADP v1 reference to README.md architecture table

## Phase 194: Creator Identity Completion
- [x] Audit CreatorIdentityPage — check existing fields and flow
- [x] Add Origin Statement field (100–300 words, "What truth/experience/mission gave rise to this creator identity?")
- [x] Ensure identity fields: Name, Identity, Avatar, Testimony, Creative Mission, Active Mediums
- [x] Wire identity completion to onboarding sequence (Identity → Domain → Manifestations)
- [x] Ensure identity page is accessible before upload (gate or prompt)
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 193.6: Production Crash Fixes
- [x] Fix /identity/:id crash — countByCreator returns {count:N} object, not plain number; extract .count before rendering
- [x] Fix /settings crash — same error boundary; /settings redirect to /settings/billing confirmed working
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 194.1: Public Creator Identity Integration
- [x] Build CreatorIdentitySection component (Origin Statement, Creative Mission, Active Mediums chips, expandable Philosophy/Doctrine/Continuity)
- [x] Wire CreatorIdentitySection into CreatorProfilePage desktop layout (below header, above DomainRenderer)
- [x] Wire CreatorIdentitySection into CreatorProfilePage mobile layout (same position, full-width)
- [x] Add empty state: "Creator identity has not yet been completed" with owner link to /profile?tab=identity
- [x] Verify identity section renders before manifestations on both desktop and mobile
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
## Phase 194.2: Shelf Manifestation Layout
- [x] Replace Albums IIFE section in CreatorProfilePage with ManifestationShelf components
- [x] Replace Full Song List section in CreatorProfilePage with StandaloneShelf for non-album songs
- [x] Add handleShelfPlay helper that maps ShelfTrack → player queue and calls playQueueAt
- [x] Import ManifestationShelf and StandaloneShelf into CreatorProfilePage
- [x] Preserve songs.length === 0 empty state
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 194.3: Creator Domain Command Center
- [x] Create /domain route and CreatorDomainPage with sidebar nav (Identity, Domain Layout, Shelves, Manifestations, Testimony, Analytics, Public Domain)
- [x] Add Edit/Preview toggle that switches between management view and live CreatorProfilePage embed
- [x] Add persistent "View Public Domain" button (opens /creator/:id in new tab) visible in all sections
- [x] Wire "My Domain" link into ProfilePage header action bar
- [x] Wire "My Domain" link into DashboardPage
- [x] Wire "My Domain" link into DashboardLayout sidebar nav
- [x] TypeScript: 0 errors | Vitest: passing

## Phase 194.3: Creator Domain Command Center
- [x] Build CreatorDomainPage (/domain) with 7-section sidebar nav
- [x] Overview section: stats, recent works, quick links
- [x] Identity section: links to profile and identity editor
- [x] Shelves section: links to ManifestationShelf (Phase 194.2)
- [x] Works section: full works list with play/manage actions
- [x] Testimony section: testimony list
- [x] Analytics section: play/witness/tip stats
- [x] Public Domain section: Edit/Preview toggle + View Public Domain link
- [x] Add /domain route to App.tsx
- [x] Add "My Domain" button to ProfilePage header action bar
- [x] Add "My Domain" as first item in ContextDrawer profile panel
- [x] Add "My Domain" as first item in MobileNavDrawer My Account section
- [x] Add "My Domain" button to DashboardPage action bar

## Phase 193.6-fix: Comment Attribution Fixes
- [x] Fix authorName in PlayerBar.tsx — use artistHandle || name || undefined
- [x] Fix authorName in MobilePlayerPanel.tsx — use artistHandle || name || undefined
- [x] Fix authorName in TheaterPlayer.tsx — use artistHandle || name || undefined
- [x] Fix authorName in MobilePlayerLayer.tsx — use artistHandle || name || undefined
- [x] Fix authorName in BookDetailPage.tsx — use artistHandle || name || undefined

## Phase 195: Cinematic Player Evolution
- [x] Build CinematicModeEngine component with mode selector and shared infrastructure
- [x] Implement Living Canvas mode (audio-reactive color extraction, particles, parallax)
- [x] Implement Archive Artifact mode (museum exhibit, WID/provenance metadata)
- [x] Implement Retro Signal mode (CRT glow, waveform, audio-reactive spectrum)
- [x] Implement Shelf Playback mode (item pulled from shelf, nearby works left/right)
- [x] Implement Cosmos Playback mode (central node, related works orbit)
- [x] Wire CinematicModeEngine into PlayerBar (desktop cinematic mode)
- [x] Wire CinematicModeEngine into MobilePlayerLayer (mobile cinematic state)
- [ ] Add mode persistence (remember last selected mode per user)

## Phase 195: Cinematic Player Evolution
- [x] Build CinematicModeEngine component with all five modes
- [x] Living Canvas mode — audio-reactive color extraction, particles, parallax
- [x] Archive Artifact mode — museum exhibit with WID, provenance metadata
- [x] Retro Signal mode — CRT glow, waveform, audio-reactive spectrum
- [x] Shelf Playback mode — manifestation pulled from shelf, nearby works visible
- [x] Cosmos Playback mode — central node with orbiting related works
- [x] Wire CinematicModeEngine into PlayerBar (desktop)
- [x] Wire CinematicModeEngine into MobilePlayerLayer (mobile)
- [x] Remove old CinematicLayer function from MobilePlayerLayer
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Phase 194.2 (Gesture): Gesture-Based Manifestation Navigation
- [x] Build useManifestationGesture hook (desktop drag, double-click, hold; mobile swipe, long-press, swipe-up)
- [x] Build ManifestationQuickView panel (cover, creator, WID, provenance, witness count, comments)
- [x] Build CreatorDomainEntry animation (swipe-up expand + creator header fade-in)
- [x] Wire gesture layer into PlayerBar (desktop: drag next/prev, double-click witness, hold Quick View)
- [x] Wire gesture layer into MobilePlayerLayer (swipe next/prev, long-press Quick View, swipe-up Creator Domain)
- [x] TypeScript check 0 errors
- [x] Vitest all passing

## Phase 194.2 (Cinematic Fix): Full-Screen Art in All Cinematic Modes
- [x] Diagnose: ArchiveArtifact showed 200px card; CosmosPlayback showed 100px circle; art never filled screen
- [x] Add shared ArtBase component: blurred bg fill + sharp full-bleed object-contain art + bottom/top gradients
- [x] Rewrite LivingCanvas: ArtBase + particle canvas overlay + controls at bottom
- [x] Rewrite ArchiveArtifact: ArtBase + grid overlay + corner accents + provenance strip overlay + controls
- [x] Rewrite RetroSignal: ArtBase + semi-transparent CRT canvas overlay + signal header + controls
- [x] Rewrite ShelfPlayback: ArtBase + queue strip overlay in lower third + controls
- [x] Rewrite CosmosPlayback: ArtBase + starfield/orbit canvas overlay + orbit labels + controls
- [x] TypeScript: 0 errors | Vitest: 237/237 passing
## Anonymous Comments Fix
- [x] Upgrade comments.add and addReply to protectedProcedure — always use ctx.user identity, never fall back to Anonymous
- [x] Upgrade getCommentsBySong to leftJoin users and resolve authorName from userId when stored value is null/Anonymous
- [x] Remove authorName from all client-side comment mutation calls (SongDetailPage, PlayerBar, TheaterPlayer, MobilePlayerLayer, MobilePlayerPanel, BookDetailPage)
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Community Feedback Fixes (Jun 9 2026 — Slimdoggy)
- [x] Remove duplicate "View Public Domain" button from Creator Domain Overview section (header button is canonical)
- [x] Fix auto-advance to next track: set audio.src directly inside onEnded setState callback to avoid React 19 concurrent-mode race with pendingAudioAction ref
- [x] Fix same race in onError handler for consistency
- [x] Fix GuideCard field names: artworkUrl (not coverArtUrl), widCode (not wid)
- [x] Add Living Nexus Canon stock guides section to Guide Directory (The Witness, Conductor, Archivist, Sovereign, Cipher)
- [x] Guide Directory now shows two sections: LN Canon + Creator Guides, both searchable

## Phase 193.6 — Mobile Overscroll & Canvas Boundary Audit
- [x] Audit html/body/#root background layers — all three now explicitly set to #000000
- [x] Add overscroll-behavior-y: contain to html element (iOS bounce containment)
- [x] Add explicit background-color: #000000 to html element (iOS paints bounce from html bg, not body)
- [x] Add explicit background-color: #000000 to #root (prevents transparent root exposing canvas)
- [x] Update theme-color meta from #0a0805 to #000000 (Android Chrome overscroll region)
- [x] Add prefers-color-scheme dark/light theme-color variants (both #000000)
- [x] Verified: overscroll-behavior: none already on html,body combined rule
- [x] Verified: body.overlay-active-full uses position:fixed to seal iOS rubber-band void
- [x] TypeScript: 0 errors

## Phase 193.6A + 194.2 Mobile Domain Consistency Pass
- [x] Audit all pages for horizontal overflow sources
- [x] Add max-width: 100% to html/body in index.css
- [x] Fix museum-pan-row overflow-y to hidden (was visible)
- [x] Add overflow-x-hidden to MainLayout main scroll container
- [x] Add overflow-hidden to ExplorePage main content wrapper
- [x] Add overflow-hidden to HomePage WIDTrustLayer, FeaturedCreatorsCarousel, NewVoicesCarousel, px-6 py-5 sections
- [x] Add overflow-hidden to DiscoverPage root container
- [x] Add overflow-hidden to CreatorProfilePage Projects section
- [x] TypeScript 0 errors
- [x] Vitest 237/237 passing

## Hero Carousel + Card Height Fixes
- [x] Remove eMastered distribution slide image, replace with mirrored slide 1 image (scaleX -1)
- [x] Add --card-img-h CSS variable (200px desktop, 190px mobile) for uniform pan-row card heights
- [x] Update prov-card-img-wrap to use fixed height/min-height/max-height via --card-img-h
- [x] TypeScript 0 errors
- [x] Vitest 237/237 passing

## Cinematic Mode Fixes (Full-Screen + Mode Switcher)
- [x] Change ArtBase sharp art from object-contain to object-cover (fills edge-to-edge, no letterboxing)
- [x] Fix ModeSelector dropdown to use position:fixed z-[9999] so overflow-hidden on root doesn't clip it
- [x] Add click-outside handler to ModeSelector so it closes on tap elsewhere
- [x] TypeScript 0 errors
- [x] Vitest 237/237 passing

## Pan Row Card Height Fix (Phase 194.X)
- [x] Wrap BookCard in fixed-height container (var(--card-img-h)) in HorizontalTrackGrid rows 1 and 2 — prevents comic/manuscript cards from being taller than audio TrackCards
- [x] Remove paddingBottom:125% override from FeaturedProjectsCarousel prov-card-img-wrap — restores uniform fixed-height standard
- [x] TypeScript: 0 errors | Vitest: 237/237 passing

## Discover Page + EvidencePanel Fixes
- [x] EvidencePanel: default expanded=true so Witnessed Work is immediately visible (not buried under down-arrow)
- [x] DiscoverPage: manuscripts/comics in grid open reader/book page instead of triggering audio error
- [x] DiscoverPage: title link routes to /book/:id for manuscript/comic content types

## Phase N+1: Duplicate Gift Panel + Download Card Fix
- [x] Remove duplicate Gift/tip panel from SongDetailPage (appeared twice: once in hero right column, once below fold)
- [x] Fix Identity Card "Download Card" button — add crossOrigin=anonymous to canvas image load to prevent canvas taint blocking toBlob/toDataURL
- [x] Add QRShareModal (ID Card) to mobile CreatorProfilePage action buttons (was plain copy-link button, now opens full ID card modal)

## Phase 196: Constellation / Cosmos Prototype
- [x] Add `songs.constellation` tRPC procedure (central song + inner ring same creator + outer ring same genre)
- [x] Build `/constellation/:songId` page with animated canvas node graph (star field, two orbital rings, glow effects)
- [x] Central node: focal song with gold ring and radial glow
- [x] Inner ring: same-creator works orbiting slowly (gold ring)
- [x] Outer ring: same-genre works orbiting at outer radius (purple ring)
- [x] WID verified dot indicator on each node
- [x] Currently-playing animated dashed ring on active node
- [x] Hover tooltip showing title, artist, WID status
- [x] Tap/click selected node panel: Play, View, Explore (navigate to that node's constellation)
- [x] Legend (bottom-left): color key for center/inner/outer/WID
- [x] Add "Cosmos" button to SongDetailPage mobile action bar
- [x] Add "Cosmos" button to SongDetailPage desktop action buttons row
- [x] Register `/constellation/:songId` route in App.tsx
- [x] TypeScript: 0 errors

## Phase 197: Image Generation in Guides Compose
- [ ] Add "Image" AgentMode to KeeperComposePage (type, color, icon, description)
- [ ] Add guides.generateImage tRPC procedure (prompt → generateImage() → return CDN URL)
- [ ] Render Image mode UI: chatbot-style prompt input, generate button, image output with download + Register as Manifestation actions
- [ ] Session-local image history (scrollable list of past generations in this session)
- [ ] TypeScript: 0 errors | Tests passing

## Phase 198: Image Generation in Guides / Keeper Compose
- [x] Add guides.generateImage tRPC procedure (server/routers.ts): accepts prompt + optional guideId, enriches prompt with guide identity context, calls generateImage helper, returns url/prompt/enrichedPrompt/generatedAt
- [x] Add Image mode to AgentMode type in KeeperAttrsContext (purple #8B5CF6 color, Sparkles icon, "Vision · Generate · Manifest" desc)
- [x] Add Image mode to KeeperPage MODES/MODE_COLORS/MODE_CAPABILITY arrays
- [x] Add image state (imagePrompt, imageHistory, isGeneratingImage, selectedGuideId) + generateImageMutation + myGuidesQuery to KeeperComposePage
- [x] Add handleGenerateImage, handleImageKeyDown, handleDownloadImage, handleRegisterImage handlers
- [x] Build Image mode UI panel (mobile): guide selector, prompt textarea, generate button, session history with download + register actions
- [x] Build Image mode UI panel (desktop): same features, max-w-2xl centered, enriched prompt display, timestamp, full-size image display
- [x] Hide composition input bar and Emotional Arc panel when Image mode is active
- [x] TypeScript: 0 errors

## Phase 199: Image Generation — WID Auto-Register, Reference Upload, Remix
- [x] Update guides.generateImage procedure: compute WID-VIS-* hash server-side from url+prompt+timestamp, return widId in response
- [x] Add guides.remixImage procedure: accepts sourceImageUrl + prompt + optional guideId, passes sourceImageUrl as originalImages to generateImage, returns same shape as generateImage
- [x] Add guides.uploadReferenceImage procedure: accepts base64 image, uploads to S3, returns url for use as reference
- [x] Update Image mode UI: show auto-generated WID badge on each image card immediately after generation
- [x] Add Reference Image upload button in Image mode (before prompt): upload → stored as referenceImageUrl state, shown as thumbnail, passed to generate/remix
- [x] Add Remix button on each image card: pre-fills prompt with original prompt, passes that image as reference, triggers new generation
- [x] TypeScript: 0 errors

## Phase 200: Quiver — Private Image Vault
- [x] Add quiverImages table to Drizzle schema (userId, url, prompt, enrichedPrompt, widId, guideId, referenceImageUrl, isRemix, title, registeredAsWid, createdAt)
- [x] Run pnpm db:push — migration applied successfully
- [x] Add quiver.save, quiver.list, quiver.delete, quiver.updateTitle tRPC procedures
- [x] Auto-save every generated image to Quiver vault (handleGenerateImage)
- [x] Auto-save every remixed image to Quiver vault (handleRemixImage)
- [x] Add Quiver toggle button in mobile Image mode panel (collapsible)
- [x] Add Quiver toggle button in desktop Image mode panel (collapsible)
- [x] Quiver panel: search by prompt, 2-col mobile / 3-col desktop grid, DL/REMIX/DEL per card
- [x] Quiver panel: WID badge, REMIX badge, date, pagination (20 per page)
- [x] TypeScript: 0 errors

## Phase 201: Bug Fixes + Archive Filter
- [x] Fix Bug 1: Broken cover art on creator profile page — add onError fallback to all <img> tags showing coverArtUrl; filter songs with null coverArtUrl from Records/Featured sections
- [x] Fix Bug 2: Dual audio overlap — enforce single global audio singleton; stop/destroy previous audio before starting new track in PlayerContext
- [x] Fix Bug 3: Archive page reload breaks global player tracking — Archive should not auto-play on load; only play on explicit user click
- [x] Add Archive filter: status filter buttons (All / Published / Draft / Deleted) + sort (Newest / Oldest / Title A-Z)
- [x] TypeScript: 0 errors
## Phase 202: Bug Fixes — Batch Upload insertId, Collection Linking, Guide Verbosity
- [x] Fix insertId extraction in routers.ts: (insertResult as any).insertId → (insertResult as any)[0]?.insertId (single upload line 1084, batch upload lines 1223+1255)
- [x] Fix insertId extraction in routers.ts: keeperCharacterSheets line 5956, marketplaceItems line 6202
- [x] Fix insertId extraction in db.ts: manifestedCollections line 4962
- [x] Add maxTokens: 800 to keeper.chat invokeLLM call to reduce Guide verbosity
- [x] TypeScript: 0 errors
## Phase 203: Inline Edit on Work Detail Page (Owner Only)
- [ ] Add editingSong state + Edit button to SongDetailPage action bar (owner only, Pencil icon, gold border)
- [ ] Add missing cover art warning banner on SongDetailPage (owner only, shows when coverArtUrl is null)
- [ ] Wire EditTrackPanel into SongDetailPage — opens on Edit click, closes on save/close, invalidates getById query
- [ ] Add missing cover art filter to ArchivePage (filter button "Missing Art" in status filter row)
- [ ] TypeScript: 0 errors

## Phase 204: Multi-Reference Image Compose + Quick Access Link
- [x] Update generateImage procedure to accept referenceImageUrls array (max 4) instead of single referenceImageUrl
- [ ] Update KeeperComposePage Image tab to support up to 4 reference image upload slots
- [ ] Add quick access Compose link to sidebar navigation
- [ ] TypeScript check and tests pass

## Phase 205: Responsive Scaling Foundation
- [x] Added clamp()-based fluid type scale (--text-xs through --text-h1)
- [x] Added fluid spacing tokens (--space-1 through --space-10)
- [x] Added Compose-specific terminal typography variables (--compose-xs through --compose-lg)
- [x] Made card-pan-w and card-img-h fluid on desktop
- [x] Fixed Compose Image tab to use fluid CSS variables
- [x] TopBar CTA zone collapses Prompt Gen and Compose to icon-only below xl breakpoint
- [x] TypeScript: 0 errors

## Phase 206: Quiver Right Column + Day Timeline + WID Search + WID Download Metadata
- [x] Update quiver.list backend to also search by widId (OR condition)
- [x] Add REST endpoint GET /api/quiver/:id/download that embeds WID PNG metadata via sharp
- [x] Restructure KeeperComposePage desktop layout: persistent Quiver right column (w-72) when in Image mode
- [x] Day-grouped Quiver timeline with TODAY/YESTERDAY/date headers using date-fns
- [x] Update quiverQuery to always be enabled in Image mode (not just when quiverOpen)
- [x] Update handleDownloadImage to call the new metadata endpoint
- [x] TypeScript: 0 errors | Vitest: 251/251 passing

## Phase 207: Witness Body Injection + Meta Description Swap
- [x] server/og.ts: inject visible ln-witness-record block on /song/:id routes
- [x] server/og.ts: inject visible ln-static-content block on /manifesto, /doctrine/wid-spec, /lexicon routes
- [x] server/og.ts: swap meta name="description" to per-song content (reuse og:description variable)
- [x] client/src/main.tsx: remove ln-witness-record and ln-static-content on React mount
- [x] Verify: /song/30001 returns "Witness ID: WID-MUS-B653BAAF-8EE48064" in body
- [x] Verify: /manifesto, /doctrine/wid-spec, /lexicon return id="ln-static-content" in body
- [x] Verify: og:title still present (unfurl unchanged)
- [x] Verify: meta name="description" is per-song (genre + WID + play count)
- [x] TypeScript: 0 errors | Vitest: 251/251 passing

## Phase 208: Living Nexus MCP Server (Read Tier)
- [x] Install @modelcontextprotocol/sdk (zod already present)
- [x] Create server/mcp/tools.ts — five read-only tools: get_work, list_works, get_page_meta, get_seo_status, query_verify_chain
- [x] Create server/mcp/index.ts — Streamable HTTP transport, bearer auth middleware, rate limit 60req/min, witness logging to logs/mcp-access.jsonl
- [x] Mount /mcp in server/_core/index.ts (one line)
- [x] Append Disallow: /mcp to client/public/robots.txt
- [x] Set MCP_READ_TOKEN env secret via webdev_request_secrets
- [x] Done criteria: 401✅ 401✅ 401✅ robots✅ 5-tools✅ 613-works✅
- [x] TypeScript: 0 errors | Vitest: 263/263 passing

## Phase 209: Keeper Compose — Drag-and-Drop Ref Images + Quiver Lightbox
- [x] Reference Images: each REF slot accepts drag-and-drop of local image files (uploads to S3, sets URL)
- [x] Reference Images: each REF slot accepts drag-and-drop of image URLs (sets URL directly)
- [x] Reference Images: visual drag-over highlight on each slot
- [x] Quiver images: clicking image opens a lightbox/fullscreen modal with the full image
- [x] Lightbox: shows WID, title, close button (click-outside)
- [x] TypeScript: 0 errors | Vitest: 263/263 passing

## Bug Fix: Image Generation Sparse Array (thiiirdgenkill report)
- [x] Fix KeeperComposePage: filter undefined/falsy entries from referenceImages.map(r => r.url) before sending to server — sparse array holes from slot-indexed assignment cause Zod validation failure ("Invalid input: expected string, received undefined") making image generation fail immediately
- [x] Add regression test: guides.generateImage with sparse referenceImageUrls array should not throw Zod validation error
- [x] Fix: raise generateImage and remixImage prompt max from 1000 to 3000 characters — thiiirdgenkill's 1541-char prompt was silently rejected by Zod before reaching the server
- [x] Add maxLength=3000 and live character counter (amber at 2700+, red at 3000) to both mobile and desktop image prompt textareas
- [x] Regression test: thiiirdgenkill's exact 1541-char prompt now passes schema validation

## Feature: New Arrivals "NEW" Badge Tag
- [x] Add `isNew` prop to StoreTrackCard — renders a green "NEW" badge in the top-left corner of the card art
- [x] Pass `isNew={mode === "new"}` to all StoreTrackCard instances in ExplorePage store view (top row + genre rows)
- [x] Pass `isNew` to StoreTrackCard in HomePage New Arrivals shelf
- [x] Fix HomePage New Arrivals seeAllHref to point to /explore?sort=new instead of /explore
- [x] TypeScript: 0 errors | Vitest: 270/270 passing

## Feature: Animated Image Generation Ritual (Vision Chamber)
- [x] Replace spinner with a living canvas ritual: particle field (CSS/canvas, no library) fills the Vision Chamber when generation starts — dark ink-like particles drift and coalesce
- [x] Prompt text fragments float upward and dissolve into the particle field as generation runs — words becoming the image
- [x] Radial gold seal (SVG stroke-dashoffset) traces itself closed at the center — represents the WID being forged
- [x] On image arrival: particles collapse inward, seal completes with a brief gold flash, image materializes with a center-out reveal wipe
- [x] First-appearance shimmer: generated image thumbnail border pulses once with a gold glow on mount — "being witnessed for the first time"
- [x] Animation works on both mobile (sidebar panel) and desktop (right panel) Vision Chamber instances
- [x] No external animation libraries — pure CSS + canvas + SVG

## Motion Direction: Environmental Storytelling (Observatory Aesthetic)
- [x] Observatory Background Canvas: persistent slow-moving 3-depth-layer starfield behind homepage (near/mid/far parallax drift, no flicker)
- [x] Hero Parallax: Ken Burns slow drift on hero image, text content at different depth layer than background
- [x] Scroll-Reveal Constellation Formation: section headers form like constellations (dots → connecting lines → content materializes) via IntersectionObserver, no library
- [x] Creator Card Orbit Focus: on hover, surrounding cards dim (depth-of-field), hovered card gets faint orbit ring — entering a creator domain feels like locking onto a star
- [x] Manifestation Reveal: track/work cards enter with slow cinematic translateY + opacity stagger by index (not bounce — slow archive surface)
- [x] StoreCreatorCard: replace hover:scale with orbit ring + depth-of-field dimming on siblings
- [x] ShowcaseRow: constellation formation reveal on scroll entry
- [x] Remove generic animate-fade-up from homepage wrapper — replace with observatory entry

## Feature: Player Queue Panel + Context Menu Oval Fix
- [x] Fix large oval "+" Add to Collection button in StoreTrackCard context menu — replaced with proper menu row (icon + label) matching other rows
- [x] Build PlayerQueuePanel component — horizontal panning strip (64×64 artwork cards, drag-to-pan, auto-scroll to current) + expandable full list mode
- [x] Strip mode: artwork cards with animated playing bars on active card, gold/nebula border glow, title below
- [x] List mode: full queue list with artwork + title + artist + duration, current track highlighted, scrollable (240px max-height)
- [x] Strip/List toggle button in panel header
- [x] Queue counter (current / total) in panel header
- [x] My Collections link at bottom of panel → navigates to /profile?tab=collections
- [x] Panel wired into GlobalPlayer expanded view — replaces old 3-track Up Next list with full queue
- [x] Works on both mobile (nebula purple) and desktop (gold) color schemes
- [x] Drag-to-pan on strip via Pointer Events API (mouse + touch)
- [x] Auto-scroll strip to keep current card centered on track change

## Feature: Creator Onboarding Manifest Pipeline
- [x] Add onboarding_progress table to drizzle/schema.ts
- [x] Push DB migration: pnpm db:push
- [x] Add onboarding tRPC procedures: getProgress, saveStep, completeOnboarding
- [x] Build /onboarding route — 7-step manifest ceremony page
- [x] Step 1: COVENANT — read and accept the creator covenant
- [x] Step 2: IDENTITY — sign in / create account via OAuth (skip if already logged in)
- [x] Step 3: DOMAIN — creator handle, origin statement, active mediums
- [x] Step 4: PRESENCE — upload profile photo + cover art (S3 upload with crop/position)
- [x] Step 5: TESTIMONY — write your creator testimony (gets a WID-TST anchor)
- [x] Step 6: LICENSE — choose tier: Founder / Creator License / Micro Pack — Stripe checkout
- [x] Step 7: FIRST WORK — upload first manifestation and receive first WID (or skip)
- [x] Progress is persistent — resume from last completed step on return visit
- [x] Observatory motion direction applied to onboarding — constellation transitions between steps
- [x] Add "Begin Your Provenance" CTA at bottom of WID Spec page
- [x] Register /onboarding route in App.tsx

## Feature: Seamless Playback & Transition Engine (Phase 212)
- [x] Add playbackSettings JSON column to users table in drizzle/schema.ts
- [x] Add per-track fadeInSeconds / fadeOutSeconds fields to songs table
- [x] Push DB migration: pnpm db:push
- [x] Add tRPC procedures: getPlaybackSettings, savePlaybackSettings
- [x] Upgrade PlayerContext with Web Audio API GainNode crossfade engine
- [x] Implement gapless mode: preload next track while current is playing
- [x] Implement crossfade mode: overlap current + next track with gain ramp
- [x] Implement per-track fade-in: ramp gain from 0 on track start
- [x] Implement per-track fade-out: ramp gain to 0 before track ends
- [x] Implement "no silence" mode: instant cut with no gap between tracks
- [x] Build /settings/playback page with all transition toggles
- [x] Settings: Crossfade toggle + duration slider (1-12 seconds)
- [x] Settings: Gapless playback toggle (no silence between tracks)
- [x] Settings: Per-track fade-in/out respect toggle
- [x] Settings: Transition mode selector (crossfade / gapless / standard)
- [x] Settings: Conceptual album mode (blend tracks, no gap, honor per-track fades)
- [x] Add fade-in/fade-out fields to CreatorStudio upload form
- [x] Register /settings/playback route in App.tsx
- [x] Add "Playback" link to settings navigation
- [x] Write vitest tests for playback settings procedures

## Feature: Provenance & Lineage System — Phase 1
- [x] Add work_events table to drizzle/schema.ts (songId, eventType, eventData, actorId, timestamp)
- [x] Add work_lineage table to drizzle/schema.ts (parentSongId, childSongId, relationshipType, versionLabel)
- [x] Add work_witnesses table to drizzle/schema.ts (songId, witnessUserId, role, status, witnessedAt, inviteToken)
- [x] Push DB migration: pnpm db:push
- [x] Add DB helpers: getWorkEvents, addWorkEvent, getWorkLineage, addLineageRelationship, getWorkWitnesses, inviteWitness, acceptWitnessInvite
- [x] Add tRPC procedures: provenance.getTimeline, provenance.getLineage, provenance.getWitnesses, provenance.inviteWitness, provenance.acceptWitness
- [x] Auto-create work_events entry on song upload (eventType: "created")
- [x] Auto-create work_events entry on WID assignment (eventType: "witnessed")
- [x] Build ProvenanceTimeline component — vertical event log with icons per event type
- [x] Build LineageGraph component — tree visualization of parent/child works
- [x] Build WitnessesPanel component — list of co-signers with roles and invite flow
- [ ] Build ContributionMap component — donut chart showing contributor percentages (Phase 2)
- [x] Wire all provenance components into song detail page (/song/:id)
- [x] Add "Add Version / Lineage" button on song detail page for creators
- [x] Add "Invite Witness" button on song detail page for creators
- [x] Write vitest tests for provenance tRPC procedures

## Phase N: Avatar Marketplace — Curated Submission + Equip + Tip
- [x] DB schema: add ai_prompt, artist_credit, art_style, model3d_status, model3d_job_id, model3d_url, model3d_format, model3d_generated_at to marketplace_items
- [x] DB schema: add equippedAvatarItemId to users table
- [x] tRPC: marketplace.createAvatarItem — founder-gated (role=founder only), uploads to CDN, stores WID + AI prompt or artist credit
- [x] tRPC: marketplace.equipAvatar — sets equippedAvatarItemId + updates profilePhotoUrl to item artworkUrl
- [x] tRPC: marketplace.unequipAvatar — clears equippedAvatarItemId
- [x] tRPC: marketplace.createAvatarTip — Stripe tip checkout for marketplace skin creators
- [x] tRPC: marketplace.listItems — extended to return aiPrompt, artistCredit, artStyle, model3dStatus, model3dUrl, model3dFormat
- [x] MarketplacePage: founder-only Submit Avatar modal with inline style guide (existing skins as reference), art style selector, AI prompt vs artist credit field, WID field, featured toggle
- [x] MarketplacePage: EQUIP button on skin cards — equips avatar, shows EQUIPPED badge + gold glow
- [x] MarketplacePage: GIFT button on skin cards — opens tip modal with $1/$3/$5/$10/$25 amounts
- [x] MarketplacePage: 3D READY badge + download link when model3dUrl is set
- [x] MarketplacePage: 3D model fields reserved in schema for future API integration (model3dStatus enum: none/pending/processing/ready/failed)
- [ ] Keeper skin slot (creator-customizable avatar) — future: wire to marketplace equip flow

## Future: Stem File Type Visibility on Profiles
- [ ] Show fileType label (Full Mix / Vocal Stem / Instrumental Stem / Bass Stem / Drum Stem / Other Stem) on creator profile track listings so visitors can see the full stem architecture of a registered work alongside the WID
- [x] GuideDetailPage: add "Gift the Creator" tip button with Stripe Checkout (guides.createTip procedure)
- [x] GuideDetailPage: add "Use This Guide in Keeper" button that navigates to /keeper?guideId=N
- [x] KeeperComposePage: read ?guideId= URL param on mount and pre-select guide + switch to Image mode
- [x] guides.createTip: new tRPC procedure — Stripe Checkout for guide tips, mirrors song tip flow

## Bug Fixes — Play/Pause Restart + Modal Centering (2026-06-15)
- [x] Fix TrackCard handleCoverClick: toggle play/pause when track is already active (Trending Now, Discover Tracks)
- [x] Fix Witnessed Voices handleVoicePlay: toggle instead of restart when track is already active; show live-wave icon when playing
- [x] Fix WorkCarousel (Witnessed Music): toggle play/pause when active; remove Link wrapper from audio cards to prevent auto-redirect to song page on play
- [x] Fix Dialog centering on mobile: add fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 to DialogContent base classes (was missing, caused modal to appear at bottom with black void above)

## Witness Subscription System

### Schema
- [ ] Add creatorPublicationFeed table
- [ ] Add witnessSubscriptions table
- [ ] Add witnessReservations table
- [ ] Run pnpm db:push migration

### Phase 1 — Witness (notifications)
- [ ] tRPC: witness.subscribe / witness.unsubscribe / witness.getSubscription / witness.getWitnessCount
- [ ] Fan-out on publish: insert into creatorPublicationFeed, notify all Witness+ subscribers
- [ ] Witness button on creator profile page
- [ ] Witness count displayed on creator profile

### Phase 2 — Reserve (archive queue)
- [ ] Fan-out: create witnessReservations for all Reserve+ subscribers on publish
- [ ] tRPC: witness.myArchive (paginated reserved manifestations)
- [ ] My Archive page at /witness-archive
- [ ] Archive entry card: cover, title, creator, WID, reserved date, download button
- [ ] Add Witness Archive nav link to sidebar

### Phase 3 — Steward (vault sync)
- [ ] Steward settings panel on witness subscription modal
- [ ] Per-content-type auto-download toggles
- [ ] tRPC: witness.stewardStats
- [ ] Archive Health display on creator profile

## Witness Subscription System — Completed
- [x] Schema: witnessSubscriptions, witnessReservations, creatorPublicationFeed tables added to schema.ts
- [x] DB helpers: witnessSubscribe, witnessUnsubscribe, getWitnessSubscription, getSubscriberCount, publishToFeed, getWitnessArchive, getWitnessArchiveCount added to db.ts
- [x] tRPC router: witnessSubscription (subscribe, unsubscribe, getSubscription, getCreatorSubscriberCount, getMyArchive) added to routers.ts
- [x] Fan-out on publish: publishToFeed called in songs.updateStatus when status = Published
- [x] Witness Subscription button on creator profile page (desktop + mobile) — Witness/Reserve/Steward tier selector
- [x] My Archive tab added to existing /archive page — shows reserved manifestations with tier badges, WID, pagination
- [x] TypeScript: 0 errors after all changes

## Image Gallery as First-Class Medium Type — Completed
- [x] Add 'image' to songs.contentType enum (schema + direct SQL ALTER)
- [x] Add 'image' to creatorPublicationFeed.contentType enum
- [x] Add autoReserveImages column to witnessSubscriptions
- [x] Add getCreatorGallery, getCreatorGalleryCount, getMyQuiverImages, updateQuiverImage helpers to db.ts
- [x] Add imageGallery tRPC router (forCreator, myVault, update procedures)
- [x] Add quiver.setPublished procedure to existing quiver router
- [x] Add Image Gallery shelf to CreatorProfilePage (gold-rim grid, hover title/WID overlay)
- [x] TypeScript: 0 errors

## Public Provenance Registration API

- [x] apiKeys table added to schema (creatorId, keyHash, keyPrefix, name, tier, dailyLimit, usageToday, usageTotal, isActive, revokedAt)
- [x] pnpm db:push applied — apiKeys table live in database
- [x] REST endpoints: POST /api/v1/works/register, GET /api/v1/works/:wid, GET /api/v1/creator/:handle/works, GET /api/v1/verify/:wid, GET /api/v1/badge/:wid, GET /api/v1/catalog, GET /api/v1/health
- [x] API key authentication middleware (Bearer token, bcrypt hash comparison)
- [x] Rate limiting per key (daily limit enforced, X-RateLimit-* headers returned)
- [x] DB helpers: createApiKey, listApiKeys, revokeApiKey, validateApiKey, incrementApiKeyUsage
- [x] tRPC apiKey router: create, list, revoke procedures (protectedProcedure)
- [x] Developer Dashboard page at /developer — generate/revoke keys, usage stats, code snippet
- [x] Public API documentation page at /developers — endpoints, auth, code examples, tier table
- [x] Vitest tests: 17 new tests covering key creation, validation, rate limiting, WID format, content type mapping (288 total passing)

## Player Expanded View — Background Overlay Fix

- [x] When global player expands, page content behind it should recede (dim overlay or slide under)
- [x] Expanded player panel should sit above all page content with correct z-index
- [x] Guide/shelf content must not bleed through the expanded player view on mobile

## API Ecosystem Completion (2026-06-18)
- [x] GET /api/v1/wid/:wid — canonical provenance lookup endpoint (accepts WID or numeric ID)
- [x] GET /api/v1/search — registry search by title, handle, or genre with contentType filter
- [x] GET /api/v1/openapi.json — OpenAPI 3.1.0 spec served at stable URL for GPT Actions and MCP
- [x] Updated /developers page with new endpoints (wid, search), OpenAPI spec link
- [x] Enhanced Python SDK example: register, verify, search functions with comments
- [x] Enhanced JavaScript SDK example: registerWork, getProvenanceRecord, searchRegistry functions

## Slimdoggy Bug Reports (2026-06-18)
- [x] BUG: Clicking a song in the archive plays the wrong track — positional index mismatch with Singles/Standalones or Records queue
- [x] BUG: Play button in archive does not register click reliably
- [x] LAYOUT: Duplicate About section on creator profile — bio text appears both in the banner hero and again as a plain About block below it

## Batch Upload Lyrics + WID-LYR (2026-06-18)
- [x] Add lyricsText + lyricsExpanded fields to TrackCard interface and makeEmptyCard in BatchUploadPage
- [x] Add collapsible lyrics textarea to each track card in BatchUploadPage (shows word count badge when filled)
- [x] Pass lyricsText through trackPayloads type and submission loop in BatchUploadPage
- [x] Add lyricsText to batchUpload tRPC input schema (z.string().max(50000).optional() per track)
- [x] Generate WID-LYR server-side in batchUpload procedure: SHA-256 of lyrics text combined with witnessId and userId
- [x] Call updateSongLyricsWithWid after song creation when lyricsText is provided in batch upload
- [x] Surface lyricsWid in SongDetailPage lyrics panel (gold badge below WID certificate block)
- [x] Surface lyricsWid in ArchivePage collection track list rows (below witnessId, handles both flat and nested data shapes)

## Sidebar Typography Brightness Fix (2026-06-18)
- [x] Increase inactive nav item color from rgba(255,255,255,0.40) to rgba(255,255,255,0.62) (~45% brightness increase)
- [x] Increase Codex link color from rgba(212,175,55,0.45) to rgba(212,175,55,0.65) (~45% brightness increase)
- [x] Restore-on-leave handlers updated to match new base values

## Cosmos UI Polish + Bug Fix (2026-06-18)
- [x] Shrink Cosmos legend to minimal collapsible icon — collapsed by default, expands on hover/tap
- [x] Fix Cosmos blank-page race condition: page renders empty on first click, requires second click to load
- [x] Implement all Cosmos UI changes in live ConstellationPage (ring labels, tooltip, content type badges, legend icon)
- [x] Remove song title and artist name from Cosmos top bar — keep only Back button, "Constellation" label, and genre tag

## Cosmos Autoplay Queue (2026-06-18)
- [x] When a track finishes playing in the Cosmos, auto-advance to the next audio node in the constellation
- [x] Skip non-audio nodes (comics, manuscripts, images) in the queue — show in Cosmos but do not play
- [x] Queue order: center node first, then inner ring (same creator), then outer ring (same genre)

## Mobile Glow Optimization (2026-06-19)
- [x] Rewrite useFrequencyGlow: replace React setBands state with direct DOM boxShadow mutation (eliminates 60fps re-renders)
- [x] Throttle glow RAF loop to 30fps on mobile (halves CPU/GPU load)
- [x] Reduce fftSize from 2048 to 512 on mobile (75% fewer frequency bins to process)
- [x] Cut box-shadow from 8 layers to 3 on mobile (less GPU compositing)
- [x] Remove canvas shadowBlur from useWaveformVisualizer on mobile (eliminates GPU blur pass)
- [x] Throttle waveform RAF loop to 30fps on mobile

## Bug Fixes — Jun 21 2026 (Slimdoggy report)

- [x] Fix What's New modal appearing in upper-left corner (desktop + mobile) — switch dialog body position fix from useEffect to useLayoutEffect so position:static is applied before first paint
- [x] Fix Home → New Arrivals showing "Nothing new this week" — expand getNewThisWeek from 7-day to 90-day window with fallback to most-recent works when window is empty
- [x] Fix Home → New Arrivals highlighting Explore icon — change New Arrivals link from /explore?sort=new to /discover (DiscoverPage already shows latest releases and correctly keeps Home icon active)
- [x] Fix Explore → Music navigation not resetting sort filter when already on /explore?sort=new — add else branch to URL sync useEffect to reset mode to "infinite" when no sort param is present; also clear contentType when no medium param is present

## Bug Fixes & Features — Jun 21 2026 (Slimdoggy session)
- [x] Fix Witness Network badge persistent red pulse — mark as seen in localStorage when tab is opened; reset when witness count increases
- [x] Add filter bar to My Works tab (search by title/genre, filter by status, filter by content type, sort by date/plays/title)
- [x] Add Play button per track and Play All button to My Works tab

## Feature — Album Play All + Download Icons (Jun 21 2026)
- [x] Add inline Play All icon button next to track count in album header (ManifestationShelf)
- [x] Add inline Download icon button next to track count in album header (ManifestationShelf)
- [x] Add onPlayAll prop to ManifestationShelfProps interface
- [x] Add handleShelfPlayAll function in CreatorProfilePage
- [x] Wire onPlayAll prop in CreatorProfilePage ManifestationShelf usage

## Bug Fix — iOS TOS Modal (Jun 21 2026)
- [x] TOS modal max-height: min(90dvh, 90vh) to prevent overflow on small iPhone screens
- [x] TOS modal overflowY: auto so entire modal scrolls if needed on mobile
- [x] TOS modal safe-area-inset-bottom padding for iOS notch/home indicator
- [x] Reduce ScrollArea height from h-64 to h-40 on mobile (sm:h-64 on larger screens)
- [x] Sticky action buttons at bottom of modal so Accept/Read Full TOS always reachable
- [x] Confirmed TosAcceptanceModal only fires for authenticated users (no guest blocking)
- [x] Confirmed WhatsNewModal already has maxHeight constraint

## Phase N: Trending Algorithm Rebuild (True 7-Day Window)
- [x] Rebuild getTrendingWorks to use playEvents 7-day window for weekly plays
- [x] New score formula: weeklyPlays×3 + weeklyLikes×5 + allTimePlays×0.1
- [x] Align staleTime on Home (60s) and Explore (120s) trending queries to same value (60s)
- [x] Write vitest test for new trending scoring logic (9 tests passing)

## Phase N+1: Pull-to-Refresh (Mobile — Comet Cosmos Spinner)
- [ ] Build CometSpinner SVG component (comet chasing its tail, gold/violet cosmos theme)
- [ ] Build usePullToRefresh hook (touch events, threshold 64px, overscroll-behavior guard)
- [ ] Wire pull-to-refresh into Home/Discover feed
- [ ] Wire pull-to-refresh into Explore page
- [ ] Wire pull-to-refresh into Witness Registry page
- [ ] Wire pull-to-refresh into My Archive page
- [ ] Verify overscroll-behavior-y: contain on all wired scroll containers

- [x] BUG: Trending This Week on home page not visibly updating after trending algorithm fix — investigate whether 7-day windowed query returns stale/flat data or scoring weights produce no visible re-ordering
- [x] BUG (CRITICAL): Edit Works on a Song Page causes full page lock-up / browser unresponsive — requires closing tab to recover. Reproducible on "The (Beat)itudes" and "Tunnel Vision (Symphonic Power Metal)". Also: searching for "The (Beat)itudes" in the archive after a fresh session returned "Page Unresponsive" without loading song content.
- [x] Add search box to My Works/My Tracks section of ArchivePage — beside the status filter select, filters the displayed tracks by title in real-time
- [x] BUG: Cover art replacement in EditTrackPanel does not save/update — upload appears to succeed but coverArtUrl is not persisted
- [x] Creator Card: expand info panel to full banner width (remove oval bubble)
- [x] Creator Card: reduce genre to single-line metadata field (3 max genres)
- [x] Creator Card: expand bio to 2-3 lines
- [x] Creator Card: add total published works count beside Founder badge
- [x] Creator Card: reorder hierarchy - Creator > Bio > Works Count > Genres
- [x] Creator Card: increase spacing/padding for typography readability
- [x] Creator Card: add hover animation to View Profile button (glow/shimmer/arrow)
- [x] Song Page: Move Reactions/Activity/Related to upper-right column
- [x] Song Page: Fix artwork parallax scroll shift

## Navigation Crash Fix (Session Continuation)
- [x] Fix site-wide "An Unexpected Error Occurred" crash on page navigation — root cause: TDZ (Temporal Dead Zone) violation in SongDetailPage.tsx where `const utils = trpc.useUtils()` was declared on line 247 but referenced inside `toggleReactionMutation.onMutate` callback on line 102. Fix: moved utils declaration to line 85, immediately after songId calculation, before any hooks that reference it.
- [x] Audit CreatorProfilePage.tsx for same TDZ pattern — found duplicate utils declaration; moved to top of main component (line 401), removed duplicate at line 484
- [x] Verify ArchivePage.tsx — utils at line 282 is already before all useMutation hooks (line 369+), no TDZ risk
- [x] Verify ExplorePage.tsx and HomePage.tsx — neither has useMutation hooks, no TDZ risk
- [x] Add global window.addEventListener("error") and window.addEventListener("unhandledrejection") handlers to main.tsx for better crash visibility in .manus-logs/browserConsole.log

## SongDetailPage Loading Skeleton
- [x] Create SongDetailPageSkeleton component (client/src/components/SongDetailPageSkeleton.tsx) — pixel-accurate shimmer matching the real two-column layout: square cover art, play button, stats row, title/chips, reactions panel, activity panel, WID provenance panel
- [x] Add ln-skeleton CSS class to index.css — gold-tinted shimmer sweep animation (lnSkeletonSweep keyframe, 1.6s ease-in-out, Living Nexus coal/gold palette)
- [x] Wire skeleton into SongDetailPage — replace spinner with <SongDetailPageSkeleton /> on isLoading

## ErrorBoundary Diagnostic Upgrade
- [x] Rewrite ErrorBoundary to surface crash reason in both dev and production: shows ErrorName + message + first component frame as a monospace blurb always visible on the crash screen
- [x] Store componentStack in state (captured in componentDidCatch) so it is available for display
- [x] Add collapsible "Full stack trace" panel (ChevronDown/Up toggle) showing full JS stack + React component tree — available in all environments, not just dev
- [x] Always log to console (name, message, stack, componentStack) so .manus-logs/browserConsole.log captures every crash
- [x] Inline variant updated to show the same diagnostic summary line
- [x] LN palette applied to full-page variant (coal background, gold border, Cinzel header)

## Creator Card Pop-out Redesign (Slimdoggy v2)
- [x] Expand card width from 256px to 320px — banner-width feel
- [x] Hierarchy: Creator identity header → Bio (3 lines) → Witness Identity glimpse → Genres (max 3, de-emphasised) → View Profile CTA
- [x] Works count moved to identity header row beside handle (@handle · N Works)
- [x] Bio expanded to line-clamp-3 (was 2)
- [x] Genres capped at 3, rendered as small de-emphasised chips (opacity 0.55 vs 1.0)
- [x] parseGenres() helper handles both comma-string and JSON-array primaryGenre values
- [x] Loading state replaced with ln-skeleton shimmer blocks matching card layout
- [x] View Profile CTA: full-width rounded-xl, gold shimmer sweep on hover (creatorCtaShimmer keyframe), ExternalLink icon nudges right 2px on hover
- [x] LN palette: coal gradient background, Cinzel name font, gold border/glow

## Creator Identity Strip in Profile Headers
- [x] Create shared CreatorIdentityStrip component (client/src/components/CreatorIdentityStrip.tsx)
- [x] Strip shows Active Mediums chips (colour-coded) + Origin Statement/Creative Mission one-liner (truncated 100 chars)
- [x] On mobile: medium chips only (blurb hidden); on desktop: chips + blurb
- [x] Strip links to /identity/:creatorId (noLink prop for identity page itself)
- [x] Injected into CreatorProfilePage — below bio/badges row, above action buttons
- [x] Injected into CreatorIdentityPage — below name/handle/badges, above Quick Stats Strip (noLink=true)
- [x] Injected into ProfilePage — below bio EditableField, inside identity block
- [x] 0 TypeScript errors, 297 tests passing

## Mobile Hamburger Menu Freeze Fix (Pixel 6 / Android Chrome)
- [x] Fix GlobalPlayer touchAction:none covering entire container — change to pan-y, restrict none to drag handle only
- [x] Remove duplicate body.overflow scroll lock in MobileNavDrawer (conflicts with overlayController)
- [x] Remove backdropFilter blur(24px) from MobileNavDrawer panel (GPU-expensive on Tensor G1)

## SongDetailPage Layout Fix + Edit Work Removal
- [x] Remove "Edit Work" button from SongDetailPage (causes page lockup; editing available in Archive)
- [x] Restore Reactions/Activity/Related panels to right column (beside artwork), not below the action buttons row
- [x] Keep Witnessed Work + Download/Versions/Share/Cosmos/ID Card action buttons in correct position below left column

## Harmonic Signature Security & Bug Fix
- [x] Fix rgba() unsigned integer overflow bug in harmonicRoute.ts (waveform PNG returns 500 JSON error)
- [x] Add creator-only auth guard to /api/harmonic/:songId/audio and /api/harmonic/:songId/image
- [x] Hide Harmonic Signature download buttons from non-creator visitors on SongDetailPage

## Hamburger Menu Freeze — Regression Fix (Jun 22 2026)
- [x] Fix overlayController single-panel race: when menu opens while player-expanded is active, closing the menu calls overlayClose("menu") which is a no-op (player-expanded is active panel), leaving body.overlay-active-full + position:fixed stuck on the body — screen frozen
- [x] Replace single-panel model with reference-counted stack so each panel independently locks/unlocks scroll
- [x] Fix z-index bleed: MobilePlayerLayer BottomNavBar/MiniBar/ExpandedSheet used hardcoded z-9000/9001/9010 — sitting above MobileNavDrawer (z-450) and MOBILE_HEADER (z-300), blocking all touch events on the drawer. Fixed to z-90/91/500 per registry hierarchy.

## Strip to Bone — Mobile Nav Casualty Assessment (Jun 22 2026)
- [x] Build /diag/strip-to-bone diagnostic page — zero nav infrastructure, raw React only, timestamped event log, body state monitor
- [x] Wire as standalone route in App.tsx (outside MainLayout, no PlayerProvider, no overlayController)

## Unified Sidebar Navigation Reconstruction (Jun 22 2026)
- [x] Audit Sidebar.tsx and MainLayout.tsx — document current structure, state, and mobile/desktop split
- [x] Rebuild Sidebar with unified mobile/desktop state: sidebarOpen (mobile off-canvas), sidebarCollapsed (desktop icon-only)
- [x] Mobile: sidebar off-canvas via transform:translateX(-100%) only — no body lock, no position:fixed, no overlayController
- [x] Desktop: sidebar pinned, collapsible to icon-only mode — unchanged behavior
- [x] Remove MobileNavDrawer.tsx entirely
- [x] Remove hamburger-triggered overlayController calls from MainLayout
- [x] Implement pure backdrop component: semi-transparent div, pointer-events only when sidebar open, onClick=close only, zero body manipulation
- [x] Clean index.css: nav-related overlay rules preserved for player/dialog use; navigation path fully clean of scroll lock
- [x] Update MainLayout content padding for unified sidebar width
- [x] Run pnpm test — 297/297 tests passing
- [ ] Manual mobile test: play song → open sidebar → navigate → confirm no freeze

## Global Player Reconstruction — One Authority (Jun 22 2026)
- [ ] Audit PlayerContext, MobilePlayerLayer, GlobalPlayer bar — document current state shape
- [ ] Build GlobalPlayerView Mini mode — compact bar, desktop + mobile, same component
- [ ] Build GlobalPlayerView Expanded mode — Layer 1 (context), Layer 2 (controls), Layer 3 (secondary), waveform stage, speed/glow, Up Next queue
- [ ] Wire GlobalPlayerView into MainLayout — replace MobilePlayerLayer and desktop player bar
- [ ] Remove MobilePlayerLayer.tsx — no longer needed
- [ ] Run pnpm test — confirm all tests pass

## Global Player Cinematic Mode — Waveform as Primary Visual Authority (Jun 22 2026)
- [x] Fix 3 TypeScript errors in cinematic portal Layer 3 (likeStatus→isLiked, handleLike→toggleLikeMutation.mutate)
- [x] Rebuild cinematic portal: waveform stage is primary visual authority (flex-1, fills remaining height)
- [x] Cinematic portal layout: Top bar → Layer 1 (context: 64px art + title + provenance) → Progress bar → Layer 2 (primary controls, 72px play) → Layer 3 (secondary: Like/Comment/Share/Tip/Volume) → Waveform Stage → Speed controls
- [x] Add cinematicCanvasRef — dedicated canvas for cinematic waveform (separate from waveCanvasRef)
- [x] waveformActive = zone === "EXPANDED" || cinematic — waveform always on in expanded/cinematic, not gated by glowEnabled
- [x] Harmonic Active pulsing chip in waveform stage (conditional on songDetail?.harmonicSignature)
- [x] Background: deep coal/purple gradient + very dim ambient art blur (brightness 0.08)
- [x] All touch targets ≥ 44px minWidth/minHeight
- [x] Delete MobilePlayerLayer.tsx — confirmed dead code (not mounted anywhere)
- [x] Update viewportLayers.ts — remove stale BOTTOM_NAV_BAR/MOBILE_NAV entries, correct CINEMATIC_PORTAL to 99995, add navigation doctrine comment
- [x] 0 TypeScript errors, 297/297 tests passing

## Bio Layout Fix — Mobile + Desktop (Jun 22 2026)
- [x] Root cause: bio <p> in flex-col context had no w-full — flex children size to content width by default, causing single-word-per-line wrapping on mobile
- [x] Fix: added w-full to mobile bio <p> (line 1448) and desktop bio <p> (line 1091)
- [x] Desktop: removed line-clamp-3 — bio now shows full text (not truncated after 3 lines)
- [x] Systemic: same root cause affects any creator profile (Slimdoggy, Doc, HulkingManiacNerdWarmonger)
- [x] 0 TypeScript errors, 297/297 tests passing

## Download Bleed Fix
- [ ] Fix download bleed: certain tracks navigate to /api/download/:id in a new page showing "Service Unavailable" instead of triggering a file download — affects "Ave, Ave!!! Christus Rex!!!" (Slimdoggy) and "Pride's March to Destruction" + "Curse of the Red Shirt" in Gathering Storm album (Nero's Shadow)
- [ ] Investigate root cause: download link opens new tab/window instead of using fetch+blob download flow
- [ ] Ensure fix is systemic — not per-track patching

## Batch Upload Albums Display Fix
- [ ] Fix Collections & Playlists tab: Batch Upload Albums section queries trpc.userCollections.list (wrong table) instead of trpc.songs.getMyCollections (correct WID-ALB collections table) — Slimdoggy's 8 batch albums not showing

## Download Bleed Fix
- [x] Add a.download="" to all 6 download triggers (SongDetailPage, CreatorProfilePage, ManifestationShelf, GlobalPlayer, PlayerBar x2)
- [x] Root cause: missing download attribute caused browser to navigate to /api/download/:id as a page instead of downloading

## Glow Bug Fixes (2026-06-23)
- [x] Fix glow static gold — beat-reactive pulsing broken on mobile (direct DOM path bypasses activeShadow React state)
- [x] Fix glow-off persistence — toggling glow off leaves border glow still visible (GOLD_SHADOW_MOBILE is always applied as baseShadow regardless of glowEnabled)

## Pending Doc Review — 2026-06-23 (Slimdoggy Session)

- [ ] [DOC REVIEW] Hide domain history panel on public creator profile — visible to visitors but serves no purpose; already accessible to creator in Edit My Domain page
- [ ] [DOC REVIEW] Feedback section for creators — options: listener testimonials on profile, witness statements tied to WID provenance, private creator feedback channel, or community creator endorsements. Witness statement concept most aligned with platform identity.

## PWA Install Prompt Fixes
- [x] Add <link rel="manifest"> to index.html — Chrome cannot discover manifest without this
- [x] Register service worker (sw.js) in main.tsx — required prerequisite for install prompt
- [x] Build PWAInstallBanner component with beforeinstallprompt handler — in-app install banner
- [x] Wire PWAInstallBanner into App.tsx — appears above GlobalPlayer mini bar

## Donation Tracker Bug (reported 2026-06-23)
- [x] Funding progress bar shows $0 despite real Stripe donations received (Slimdoggy donated $50-55 to LN fund; $30 to Super O: Save the Mainframe) — root cause: Stripe in test mode can't see live payments; added admin.manualCreditDonation procedure + Manual Credit panel in Admin → Projects tab
- [x] Trace Stripe webhook → DB write → UI query: root cause confirmed (test key can't see live sessions)
- [x] Fix root cause so progress bar reflects actual total donated: manual credit tool added; permanent fix requires switching to live Stripe keys

## Server Folder Refactor
- [x] Moved 62 server root files into clean subfolders: routes/ (12 files), workers/ (5 files), services/ (12 files), utils/ (2 files), tests/ (29 files), routers/ (index.ts + normalization.ts + qr.ts)
- [x] Deleted routers.ts.patch
- [x] Updated all import paths across server/, mcp/, and test files
- [x] 297/297 tests pass, 0 TypeScript errors after refactor

## Auth Policy Enforcement (Browse-Free / Download-Gated)
- [x] Audit all pages and components for forced login redirects or login-wall guards on browse/listen actions
- [x] Remove any page-level useEffect/navigate-to-login guards that fire on load for unauthenticated users
- [x] Remove any login prompts on play/listen/view actions
- [x] Ensure download buttons show a login prompt (not a hard redirect) when user is not authenticated
- [x] Ensure download buttons show a "no license" message when user is authenticated but has no grant
- [x] Verify GlobalPlayer and PlayerBar play actions work without login
- [x] Verify SongDetailPage loads and plays without login
- [x] Verify CreatorProfilePage loads without login
- [x] Verify Explore/Home pages load without login
- [x] Confirm mutation-cache redirect still fires for expired-session mutations (non-download protected actions)

## Auth Policy Enforcement (Browse-Free, Download-Gated)
- [x] Remove hard page-load redirect from ArchivePage (soft sign-in gate instead)
- [x] Remove hard page-load redirect from LikedPage (soft sign-in gate instead)
- [x] Remove hard page-load redirect from PlaylistPage (soft sign-in gate instead)
- [x] Remove hard page-load redirect from OnboardingManifest (soft sign-in gate instead)
- [x] Change useLike hook to show toast instead of hard-redirect when user is not logged in
- [x] Add login prompt toast to SongDetailPage download buttons when user is not logged in
- [x] Add login prompt toast to PlayerBar download button (toolbar) when user is not logged in
- [x] Add login prompt toast to PlayerBar context menu download button when user is not logged in
- [x] Add login prompt toast to GlobalPlayer context menu download button when user is not logged in
- [x] Require auth for free tracks in songs.download tRPC procedure (server-side)
- [x] Require auth for free tracks in /api/download/:songId route (server-side)

## Homepage Redesign — Sacred Geometry + Creator-First Discovery (Phase 90)
- [x] Add Golden Ratio CSS variables (--phi, --phi-inv, --hero-h) to index.css
- [x] Update HeroCarousel height to use φ-height (61.8vh via var(--hero-h))
- [x] Restructure main render to: Hero → ShowcaseSection → DiscoverySection → Creator Spotlights → Featured Projects → Genre/Discover/Trending → Medium Carousels → Prompt Studio → Subtle Doctrine (§7) → Founder's Era (§8) → Why Work With Us + CTA (§9) → Distribution Teaser → ContributorsStrip
- [x] Remove duplicate WIDTrustLayer, WID Clarity, Featured Creators, New Voices, Featured Projects, Genre/Discover/Trending, Medium Carousels, Prompt Studio, Why Work With Us blocks from old positions
- [x] Add §9 Why Work With Us + Final CTA ("Share Your Work" / "Explore Works") after Founder's Era
- [x] Update CTA labels to "Share Your Work" and "Explore Works" (natural, not forced)
- [x] Verify 0 TypeScript errors and 309/309 tests pass
- [x] Clean build confirmed (HomePage-DEJ4xalW.js)

## Phase N+1: Fix Forced OAuth Redirect for Guest Users on Mobile Chrome
- [x] Root cause 1: playback.getSettings (protectedProcedure) in PlayerContext had no enabled guard — fired for all visitors including guests, returning 401 that triggered redirect
- [x] Root cause 2: mutation cache subscriber in main.tsx had no guest-safe exemption — any mutation 401 triggered redirect
- [x] Created client/src/lib/sessionFlags.ts with markHadSession() / hadSession() utilities
- [x] Updated main.tsx: redirect handler now checks hadSession() before redirecting — fresh guests are never redirected
- [x] Updated useAuth.ts: calls markHadSession() when auth.me resolves with a real user
- [x] Updated PlayerContext.tsx: added enabled: hadSession() guard to playback.getSettings query
- [x] 309/309 tests passing, 0 TypeScript errors, clean production build

## Phase N+2: Homepage Redesign — Creator-First Discovery Platform
- [x] Rebuild HomePage with cinematic hero (live trending work, 61.8vh golden ratio)
- [x] New Arrivals horizontal scroll row (StoreTrackCard md, real data from songs.newThisWeek)
- [x] Trending This Week horizontal scroll row (real data from songs.trending)
- [x] Featured Creators horizontal strip (real data from profile.featuredCreators)
- [x] Compact "What is Living Nexus" WID explainer section (secondary, 3-column)
- [x] Remove heavy/noisy sections: WID counter block, Cosmic Medium grid, Witnessed Voices, Genre filter grid, HorizontalTrackGrid 2-row, FeaturedProjectsCarousel, ObservatoryCanvas
- [x] Work cards emphasize creation first (large art), creator name secondary
- [x] Dark premium aesthetic, golden ratio spacing, mobile-first
- [x] TypeScript: 0 errors | Vitest: 309/309 passing

## Phase N+3: Singular Source of Truth — Cross-Platform API Contract
- [x] Audit songs, WID, provenance, license, and download routers for completeness and field consistency
- [x] Create shared/coreDataTypes.ts — canonical TypeScript types for SongRecord, WitnessRecord, ProvenanceEvent, LicenseRecord, DownloadGrant, CreatorProfile
- [x] Ensure all critical fields (widHash, createdAt UTC, ownerId, licenseCount, manifestData) are returned consistently across all procedures
- [x] Add @version JSDoc comments to all key procedures in songs, profile, and license routers
- [x] Normalize getWitnessedVoices to return canonical FeedRow { song, creator } shape (was flat)
- [x] Add role field to getSongWithCreator creator subset (match CreatorSummary)
- [x] Verify verify/:witnessId returns complete WitnessRecord with all provenance fields
- [x] Write Vitest contract tests (server/coreDataTypes.test.ts — 8 tests)
- [x] TypeScript: 0 errors | Vitest: 317/317 passing

## Phase N+4: Card Consistency & Mobile Polish
- [x] Audit StoreTrackCard, TrackCard, and all pages that render cards
- [x] Rebuild StoreTrackCard (Witness Card): dominant artwork, glowing play button, elegant WID badge, portrait aspect ratio
- [x] Rebuild ExploreCard (Witness Card): same design language, full action set (like/tip/add-to-list)
- [x] Replace all TrackCard usages in ExplorePage classic view with ExploreCard
- [x] Remove dead HorizontalTrackGrid + TrendingHorizontalGrid from HomePage (unused)
- [x] Remove unused TrackCard + BookCard imports from HomePage
- [x] Polish ShowcaseRow: section header typography, mobile snap scroll, hide arrows on mobile
- [x] TypeScript: 0 errors | Vitest: 317/317 passing

## Phase N+5: Sacred Vision — Homepage & Witness Card Elevation
- [x] Elevate StoreTrackCard: deeper scrim, luminous title, parchment creator whisper, gold WID seal with inner glow, play button with sacred pulse
- [x] Elevate ExploreCard to match StoreTrackCard exactly (same reliquary standard)
- [x] Rebuild CinematicHero as Living Witness hero: WID seal integrated, "Witness This Work" CTA, dominant title, whispered creator
- [x] ShowcaseRow: golden-ratio section spacing, subtle divider between sections, breathing room
- [x] Add subtle laminin/cross motif as section divider in index.css
- [x] Center-card elevation effect in ShowcaseRow (scale transform on focused card)
- [x] TypeScript: 0 errors | Vitest: all passing

## Phase N+6: Final Polish Pass — Sacred Cathedral Standard Elevation
- [x] StoreTrackCard v2.1: WID seal upgraded (bg 0.15, border 0.60, inset highlight rgba(255,220,100,0.24), glow 0.22)
- [x] StoreTrackCard v2.1: Deeper cinematic scrim (0.95 → 0.75 → 0.32 → 0.08 → transparent)
- [x] StoreTrackCard v2.1: Title warm luminous white rgba(252,248,240,1) + fourth shadow layer (gold warmth 0.08)
- [x] StoreTrackCard v2.1: Play button 54px with inset highlight on both states
- [x] StoreTrackCard v2.1: Card inactive border 0.22, hover lift -5px scale(1.018), breathing inner glow inset 0.06
- [x] ExploreCard: Identical token elevation applied (scrim, WID seal, title, play button, hover glow)
- [x] CinematicHero: Artwork brightness 0.65 saturate 1.18 (deeper, more cinematic)
- [x] CinematicHero: Left scrim 0.92, bottom scrim 0.95, corner vignette deepened
- [x] CinematicHero: Sacred geometry border frame inset glow 0.10/0.06 (up from 0.08/0.04)
- [x] CinematicHero: WID eyebrow badge elevated (border 0.55, glow 0.22, inset highlight 0.24)
- [x] CinematicHero: "Witness This Work" button border 0.45, glow 0.14, inset highlight 0.18
- [x] CinematicHero: "Play Now" button inset highlight rgba(255,240,160,0.20)
- [x] ShowcaseSection: Padding increased pt-10 pb-6 (from pt-6 pb-2)
- [x] ShowcaseRow: Bottom margin mb-16 (from mb-14), section header mb-7 (from mb-6)
- [x] WIDExplainer: Vertical padding py-16 (from py-12)
- [x] TypeScript: 0 errors | Tests: 317/317 passing | Clean production build

## Phase N+7: Infinite Scroll on Explore Page
- [x] Add songs.discoverInfinite tRPC procedure (cursor-based, returns { items, nextCursor })
- [x] Replace manual offset/allSongs state machine in ExplorePage with useInfiniteQuery
- [x] Wire IntersectionObserver sentinel to fetchNextPage
- [x] Add cinematic loading indicator and end-of-feed marker
- [x] Invalidate discoverInfinite in pull-to-refresh handler
- [x] Write Vitest test for discoverInfinite procedure
- [x] TypeScript check + clean build + checkpoint

## Phase N+8: Harmonic Glow — ECDSA Visual Signature on Global Player
- [x] Audit global player component and WID/ECDSA data on current song
- [x] Build useHarmonicSignature hook — FNV-1a deterministic HSL/color from WID+ecdsaSignature bytes
- [x] Add harmonic-breathe CSS keyframe and .harmonic-glow-layer class to index.css
- [x] Wire glow layer to expanded player — visible only when expanded, zero cost when collapsed
- [x] Harmonic border: expanded player border reflects song's ECDSA signature color
- [x] TypeScript: 0 errors | Tests: 324/324 passing | Clean production build

## Phase N+9: Sacred Harmonic System — Platform-Wide Living Testimony
- [x] Audit waveform visualizer hook, nav bar component, and existing harmonic system
- [x] Expose harmonicSig from PlayerContext (or a dedicated HarmonicContext) for global consumption
- [x] Wire harmonic signature into waveform visualizer — hue shift, glow intensity, pulse color
- [x] Apply subtle harmonic resonance to top navigation bar — soft bottom-edge glow when playing
- [x] TypeScript check + clean build + checkpoint

## Phase N+12: Fix Page Freeze on Edit Work / Add Art
- [x] Diagnose root cause of freeze when editingOpen state is set to true
- [x] Fix EditTrackPanel so it opens cleanly without freezing
- [x] Add error boundary / loading state around EditTrackPanel
- [x] Verify fix on desktop and mobile
- [x] 0 TypeScript errors, 324/324 tests passing

## Phase N+12: Fix Page Freeze on Edit Work / Add Art
- [x] Root cause: overlayOpen("edit-track") used default "full" mode which sets body { position: fixed }
- [x] body is already h-dvh overflow-hidden (MainLayout) so it is NOT the scroll container
- [x] Setting position:fixed on body changed the containing block for ALL fixed children (PlayerBar, GlobalPlayer, mobile header), triggering a massive synchronous layout-recalculation cascade that froze the browser
- [x] Fix: changed overlayOpen("edit-track", "full") to overlayOpen("edit-track", "light") — overflow:hidden only, no position:fixed
- [x] Added stable useCallback handlers (handleEditClose, handleEditSaved) in SongDetailPage to prevent Escape-key useEffect from re-registering on every parent re-render
- [x] Both "Edit Work" and "Add Art" buttons use the same EditTrackPanel — both are now fixed
- [x] 0 TypeScript errors, 324/324 tests passing

## Phase N+13: Edit Chapel — Sacred Unified Track Edit Experience
- [x] Audit current EditTrackPanel, Archive edit button, Creator Domain edit button, SongDetailPage edit button
- [x] Build new EditChapel component: sacred right-side drawer, mobile full-screen, all required sections
- [x] EditChapel sections: cover art preview + replace, title, genre, creation date, status, Origin Story, lyrics editor, creation disclosure, delete with confirmation
- [x] Wire EditChapel into Archive page (/archive)
- [x] Wire EditChapel into Creator Domain / Profile page
- [x] Wire EditChapel into SongDetailPage (/song/:id) — replace current EditTrackPanel usage
- [x] 0 TypeScript errors, all tests passing

## Phase N+13: Edit Chapel — Sacred Unified Edit Experience
- [x] New EditChapel component built (client/src/components/EditChapel.tsx)
  - [x] Sacred right-side drawer with "light" overlay mode (no position:fixed freeze)
  - [x] Large cover art preview with Replace Art upload (field order fixed)
  - [x] Prominent title field (Cinzel, dominant typography)
  - [x] Genre, Release Date, Status (Draft/Published/Unlisted), Caption
  - [x] Origin Story textarea with deep prompting
  - [x] Expandable Lyrics editor
  - [x] Expandable AI Disclosure + Training Consent section
  - [x] Delete with two-step confirmation ("This cannot be undone")
  - [x] Sticky save bar with glow on save, loading states, error handling
  - [x] Mobile-first, full-height on mobile, 480px drawer on desktop
- [x] ArchivePage: EditTrackPanel replaced with EditChapel
- [x] ManifestationShelf: onEditTrack prop threaded through to TrackCard (carousel) and TrackListRow (list)
  - [x] Pencil icon appears on hover on carousel cards (top-right)
  - [x] Pencil icon appears on hover on list rows (between WID and Download)
- [x] StandaloneShelf: isOwner + onEditTrack props added and forwarded
- [x] CreatorProfilePage: editingChapelSong state added, ManifestationShelf + StandaloneShelf wired with onEditTrack, EditChapel mounted at bottom
- [x] SongDetailPage: EditTrackPanel import/mount replaced with EditChapel (same editingOpen state, stable callbacks preserved)
- [x] 0 TypeScript errors, 324/324 tests passing

## Phase N+14: SongDetailPage Cathedral Elevation
- [x] Ambient cathedral scrim — radial gold glow behind hero section
- [x] Back button elevated to Cinzel font with gold tint and hover slide
- [x] Cover art sanctuary: sg-hero-frame corner brackets, witness-breathe glow when playing
- [x] Missing cover art: sacred placeholder with Music relic icon + inviting "Add Art" button
- [x] Stats row: plays, likes, witnesses in gold-tinted chips
- [x] Primary CTA play button: large, gold-bordered, luminous
- [x] Title sanctuary: dominant Cinzel h1 with gold text-shadow, creator whisper, sg-divider
- [x] WID seal: wid-origin-glow pulse animation, architectural border
- [x] Sacred Tools row: btn-gold-glow on all action buttons with generous spacing
- [x] Page wrapper: cathedral-enter fade-in on load, harmonic-resonance edge glow when playing
- [x] Staggered entrance animations: art (0.05s), title (0.12s), WID (0.22s), tools (0.32s)
- [x] New CSS tokens added: cathedralFadeIn, cathedralScaleIn, cathedral-enter-*, harmonicEdge, harmonic-resonance
- [x] 0 TypeScript errors, 324/324 tests passing

## Phase N+15: Batch Upload Bug Fixes (Slimdoggy Report)
- [x] Fix track duplication: 11 files dropped → 22 cards (drop handler firing twice)
- [x] Add client-side ID3 metadata auto-import on file drop (title, cover art, lyrics)

## Phase N+15: Batch Upload Bug Fixes (Slimdoggy report — PC app)
- [x] Bug 1 — Track duplication (11 files → 22 cards)
  - [x] Root cause: inner drop zones did not call e.stopPropagation(), so drop event bubbled to outer handleGlobalDrop and added files twice
  - [x] Fixed: added e.stopPropagation() to TrackDetailPanel audio drop zone, TrackDetailPanel cover art drop zone, and TrackCardUI audio drop zone
- [x] Bug 2 — ID3 metadata (artwork + lyrics) not auto-imported on batch drop
  - [x] useAudioMetadata hook with music-metadata parseBlob already existed but was only called in per-card handleAudioFile (single-file path)
  - [x] handleAddMultiple (multi-file drop from Add Track slot) and handleGlobalDrop (page-level drop) never called extractMetadata
  - [x] Fixed: added extractBatchMetadata (useAudioMetadata) to main BatchUploadPage component
  - [x] Both handleAddMultiple and handleGlobalDrop now call extractBatchMetadata per card after creation
  - [x] Metadata applied: title, genre, lyricsText, releaseDate (year), coverFile + coverPreview (embedded art)
  - [x] Also fixed lyricsText field name (was incorrectly 'lyrics') in TrackDetailPanel and TrackCardUI handleAudioFile patches
  - [x] Also added releaseDate (year) to per-card handleAudioFile patches
- [x] 0 TypeScript errors, 324/324 tests passing

## Bug: Discovery Pages Empty — No Songs Populating
- [x] Check DB: verify published songs exist with correct status='Published' and coverArtUrl
- [x] Check songs.newThisWeek, songs.trending, songs.discoverInfinite tRPC procedures for incorrect filters
- [x] Check frontend: verify HomePage and ExplorePage are not stuck in loading/empty state
- [x] Fix root cause and verify songs appear on Homepage and Explore on both desktop and mobile
- [x] 0 TypeScript errors, all tests passing

## Bug: Discovery Pages Still Empty (Round 2 — Deep Investigation)
- [x] Trace live API responses from songs.newThisWeek, songs.trending, songs.discoverInfinite
- [x] Verify DB query filters (status, visibility, owner-only logic)
- [x] Trace frontend rendering pipeline — check if data reaches StoreTrackCard/ExploreCard
- [x] Fix root cause and verify songs appear on Homepage and Explore
- [x] 0 TypeScript errors, all tests passing

## Phase N+X: Mobile Discovery Sections Blank Fix
- [x] Root cause: ConstellationReveal/ManifestationReveal used IntersectionObserver with root:null (viewport), but app scrolls inside a nested div (MainLayout player-scroll-area), so off-screen sections never triggered reveal
- [x] Fix ConstellationReveal: dual observers (scroll root + viewport), rootMargin "0px 0px 400px 0px", 300ms hard fallback
- [x] Fix ManifestationReveal: positive rootMargin "0px 0px 300px 0px", 400ms hard fallback
- [x] 0 TypeScript errors, 324/324 tests passing
- [x] Fix ConstellationReveal and ManifestationReveal hiding content on mobile (opacity always 1, only animate transform)

## Phase N+Y: Loosen Discovery Filters
- [x] Extend New Arrivals window from 90 days to 180 days with always-show fallback
- [x] Add graceful trending fallback: if weekly score is all zero, sort by all-time playCount (allTimePlays weight raised from 0.01 to 0.1)
- [x] Ensure discoverInfinite Explore page shows full published catalog with no extra filters (confirmed: only isPublic+Published filters)
- [x] Add "New Arrivals" label clarification: show "Recently Added" when using fallback window

## Phase N+Y: StoreTrackCard Blank Content Fix
- [x] Root cause: Link (anchor) rendered as inline element, collapsing card height to 43px — aspect-ratio on child div was ignored
- [x] Fix: moved cardWidth/flex-shrink-0/snap-start/aspect-ratio to Link element with display:block; inner div uses w-full h-full
- [x] 0 TypeScript errors, 324/324 tests passing

## Phase: Player Menu + Queue + Playlist Flow
- [ ] Fix three-dot menu: open below player bar (top: rect.bottom + 8) not above
- [ ] Add appendToQueue() to PlayerContext (appends to end of queue)
- [ ] Add "Add to Queue" option in player three-dot context menu with toast feedback
- [ ] Add "Add to Queue" option in StoreTrackCard context menu
- [ ] Add "Save Queue as Playlist" button in PlayerQueuePanel
- [ ] Build SaveQueueAsPlaylistModal: name, description, AI cover generation, save
- [ ] Wire AI cover generation to playlists.create with coverArtUrl
- [ ] Show saved playlists on creator profile under Collections/Domain

## Edit Chapel Audit & Elevation
- [x] Fix server bug: releaseDate missing from updateMetadata Zod schema (was silently stripped by Zod)
- [x] Fix server bug: haaiOriginStory missing from updateSongMetadata DB helper (was in router schema but never persisted to DB)
- [x] Fix server bug: moodTags missing from updateSongMetadata DB helper (was in router schema but never persisted to DB)
- [x] Add releaseDate, haaiOriginStory, moodTags to updateSongMetadata DB helper type + updateSet
- [x] Remove `as any` cast from handleSave — releaseDate now properly typed in Zod schema
- [x] Elevate EditChapel UI: wider drawer (600px), hero-style full-width cover art (220px tall)
- [x] Add "Preview" link in header (opens public song page in new tab)
- [x] Add description field (extended description, separate from caption)
- [x] Origin Story section always visible (not collapsed) with larger textarea (7 rows)
- [x] Lyrics section: improved toggle button with line count badge
- [x] Creation Disclosure: improved toggle button styling
- [x] Danger Zone: more spacious padding, cleaner layout
- [x] Save footer: improved gold glow, consistent padding
- [x] 340/340 tests passing, 0 TypeScript errors

## Edit Chapel Unification — All Four Access Points
- [x] Audit all four creator surfaces for EditChapel integration status
- [x] Wire EditChapel into Creator Domain page (Manifestations section) — Pencil button on each song row, onSaved invalidates mySongs
- [x] Wire EditChapel into Profile page (Works tab song rows) — Pencil button (gold, visible on hover), onSaved invalidates mySongs
- [x] Add description + witnessId to SongDetailPage EditChapel props for full field parity
- [x] Verify Archive onSaved cache invalidation (utils.songs.mySongs.invalidate)
- [x] 340/340 tests passing, 0 TypeScript errors

## Creative Drawer — Fix Freeze + New Premium Edit Experience
- [ ] Fix EditChapel backdrop: change onClick to onPointerDown with e.target===e.currentTarget guard
- [ ] Add 100ms mount delay before backdrop becomes interactive (prevents same-click-close)
- [ ] Add e.stopPropagation() on drawer panel container
- [ ] Pause SongDetailPage scroll listener when editingOpen is true
- [ ] Build CreativeDrawer.tsx: cover art hero, title, video section, lyrics, AI caption generator, provenance stamp
- [ ] Wire CreativeDrawer into SongDetailPage (replaces EditChapel)
- [ ] Wire CreativeDrawer into Archive, Creator Domain, Profile pages
- [ ] Ensure cache invalidation on save across all surfaces

## Creative Drawer — Freeze Fix + New UX (Jun 26 2026)

- [x] Diagnose freeze root cause (backdrop click fires on same event that opened drawer; body.overflow:hidden scroll storm)
- [x] Build CreativeDrawer.tsx with 100ms mount delay + onPointerDown backdrop guard + stopPropagation on panel
- [x] Cover art hero section (full-width, hover overlay, replace/upload)
- [x] Title, Genre, Status, Release Date fields
- [x] Add Video section (URL input + upload)
- [x] Add Lyrics section (collapsible editor)
- [x] AI Caption section (generate or edit)
- [x] HAAI / Origin Story section
- [x] Provenance Stamp section (WID display)
- [x] Wire CreativeDrawer into SongDetailPage (replaces EditChapel, adds videoUrl/videoWitnessId)
- [x] Wire CreativeDrawer into ArchivePage
- [x] Wire CreativeDrawer into CreatorDomainPage
- [x] Wire CreativeDrawer into ProfilePage
- [x] 340/340 tests pass, 0 TypeScript errors

## Edit Work Freeze Fix v3 (Definitive) — Jun 26 2026

- [x] Diagnose freeze root cause: overlayController sets body.overflow:hidden which triggers layout reflow + SongDetailPage window.scroll listener + React setState = main-thread lock
- [x] Remove overlayController dependency from CreativeDrawer entirely
- [x] Replace with self-contained scroll lock targeting .player-scroll-area div (zero-reflow)
- [x] Add 120ms backdropActive mount delay to prevent same-click-close
- [x] Wrap CreativeDrawer in ErrorBoundary (inline) at all four call sites: SongDetailPage, ArchivePage, CreatorDomainPage, ProfilePage
- [x] Fix spurious ErrorBoundary tag accidentally added to BannerPositioner in ProfilePage
- [x] 0 TypeScript errors, 340/340 tests pass

## Dropdown Z-Index Fix (Jun 26 2026)
- [x] Diagnose Select/dropdown rendering behind CreativeDrawer (z-50 vs zIndex:9000)
- [x] Add container prop to SelectContent in select.tsx (forwards to SelectPrimitive.Portal)
- [x] Add drawerRootRef to CreativeDrawer root div
- [x] Wire container={drawerRootRef.current} to both SelectContent instances (Genre + Status)

## Parallel Skill Test — 8 Threads (Jun 26 2026)
- [ ] T1: Fix remaining z-index issues in CreativeDrawer (popover, tooltip, dropdown-menu if used inside drawer)
- [ ] T2: Verify drawer stability from Creator Domain, Archive, Song Detail (ErrorBoundary + no freeze)
- [ ] T3: Improve Missing Cover Art placeholder — more elegant/sacred across all card types + SongDetailPage
- [ ] T4: Contrast audit — scan discovery/explore pages for black/invisible text or image contrast issues
- [ ] T5: Unify Edit Work drawer behavior — confirm identical experience from all surfaces
- [ ] T6: Add External Links / Find It Elsewhere section to song pages + Creator Domain
- [ ] T7: Improve provenance stamp visibility and update logic after edit save
- [ ] T8: Make HAAI / Origin Story field prominent in CreativeDrawer

## Creative Chapel — Visual Elevation (Jun 26 2026)
- [x] Elevated CreativeDrawer to "holy space" aesthetic — full visual rewrite
- [x] Art hero enlarged to 280px with animated concentric gold relic rings (empty state)
- [x] Sacred geometric background texture (radial gradients) on drawer panel
- [x] Title field elevated: Cinzel serif, 1.25rem, gold bottom-border accent when filled
- [x] Section dividers: wider spacing (my-9), symmetric gold gradient lines
- [x] Origin Story: Cormorant Garamond font, left gold border accent, faint flame watermark
- [x] AI Generate button: sacred gold gradient, Cinzel letterSpacing, glow shadow
- [x] Footer Save button: wider (160px), more dramatic gold glow, Cinzel 0.12em tracking
- [x] All 5 TypeScript errors fixed (songId removed from generateCaption, enum casts, null→undefined)
- [x] 0 TypeScript errors, 340/340 tests pass
- [x] All 4 call sites (SongDetailPage, ArchivePage, CreatorDomainPage, ProfilePage) retain ErrorBoundary
- [x] drawerContainerEl state pattern preserved for Radix portal z-index fix
- [x] Scroll lock targets .player-scroll-area with body fallback preserved

## Creative Chapel — Mobile & Polish Audit (Jun 26 2026)
- [x] Add slideInRight and pulse keyframe animations to index.css (missing — drawer appears instantly, rings are static)
- [x] Fix mobile hover overlay: add touch-friendly cover art replace hint visible on mobile (no hover events on touch)
- [x] Add externalLinksJson to ArchivePage, CreatorDomainPage, ProfilePage CreativeDrawer call sites (currently missing — links editor always starts empty)
- [x] Adapt drawer header icon/label to contentType (comic → BookOpen, manuscript → FileText, audio → Music)
- [x] Verify provenance stamp refresh on all 4 surfaces after save — updateMetadata.onSuccess invalidates both mySongs + getById on all surfaces
