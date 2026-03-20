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
- [ ] Build /verify/:witnessId public provenance page
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
