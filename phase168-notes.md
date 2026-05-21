# Phase 168 Implementation Notes

## Task 1: Wire CreatorCard into TrackCard

**Current state:** TrackCard ALREADY uses CreatorHandle component (line 287-293) which has the 
witness identity popup via CreatorMiniCard. The popup shows:
- Avatar, name, handle, role badge
- Bio snippet
- Witness Identity glimpse (witnessEpitaph or witnessPhilosophy)
- "VIEW FULL IDENTITY" link to /identity/:id
- Stats (genre, song count)
- "View Profile" CTA button

**What's needed for StoreTrackCard:** The StoreTrackCard component (used in HomePage store sections 
and ExplorePage) does NOT use CreatorHandle — it just renders a plain text artist name. We need to 
integrate CreatorHandle into StoreTrackCard's Layer 5 (Attribution) section.

**Data needed:** StoreTrackCard's SongData interface needs `userId` (already has it) and 
`creatorRole` (needs to be added). The `artistHandle` is already there.

## Task 2: Sigil Upload

**Current state:** IdentityEditor has a text input for sigilUrl. Need to replace with image upload.
- Use same pattern as uploadAvatar: base64 → micronize → storagePut
- Need a "sigil" preset in imageProcessing.ts (square, 400x400, like avatar)
- Need a new procedure: profile.uploadSigil

## Task 3: Distribution Interest Form Persistence

**Current state:** DistributionPage has a form with fields (name, email, genre, catalog size, 
distribution goals). Currently just shows a toast on submit.
- Need a `distributionInterests` table in schema
- Need a procedure to save submissions
- Need to wire the form to the procedure
