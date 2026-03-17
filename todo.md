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
