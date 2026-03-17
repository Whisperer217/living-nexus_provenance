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
