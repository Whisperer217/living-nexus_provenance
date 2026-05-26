# Living Nexus Mobile — Build Roadmap

**Platform:** Expo SDK 54 / React Native 0.81
**Repo:** `living-nexus-mobile` (separate Manus WebDev project)
**Doctrine:** All mobile decisions must pass the LAMININ test. See [docs/LAMININ.md](./docs/LAMININ.md).

> *"In him all things hold together."* — Colossians 1:17

---

## Guiding Principle

The mobile app is not a stripped-down version of the web platform. It is the **primary witness surface** — the device a creator holds in their hand when the work is made. The WID ceremony must feel sacred on mobile. The registry must feel real. The community must feel alive.

Every screen must pass the same test as every web feature: does this hold something together or does it separate something?

---

## Current State — Phase 1 Complete (May 2026)

Phase 1 delivered the full UI shell with dual divine theme, mock data, and all five core screens. The app is ready for database wiring.

### What Is Built

| Component | Status | Notes |
|---|---|---|
| **5-tab navigation** | Complete | Discover, Profile, Witness, Studio, You |
| **Discover screen** | Complete | Light theme, featured creator, new witnesses, trending works |
| **Creator Profile screen** | Complete | Dark sanctuary theme, tabs, mini audio player |
| **Witness screen** | Complete | Dark theme, 3-step ceremony flow (UI only) |
| **Studio screen** | Complete | Dark theme, LAMININ arms, works list, quick actions |
| **You screen** | Complete | Dark theme, WID identity card, settings, doctrine arms |
| **WID Badge component** | Complete | 3 sizes, verified state, gold-on-dark |
| **Creator Card component** | Complete | Featured, compact, and row variants |
| **Hamburger Menu** | Complete | Drawer with LAMININ arm navigation |
| **Quick Reference Slider** | Complete | Left-side page summary, all screens |
| **Mini Audio Player** | Complete | Play/pause, progress, track info |
| **Mock data** | Complete | 5 creators, 5 works, 5 witness entries |
| **Dual divine theme** | Complete | Light (public entry) / Dark (sanctuary) |
| **TypeScript** | Clean | 0 errors |
| **Unit tests** | Passing | 13 tests covering all mock data contracts |

### Design Language

The mobile app uses the **Divine Noir** aesthetic established in `ideas.md`:

- **Dark sanctuary palette:** `#080C14` background, `#C9A84C` gold accent, `#F0EDE6` text
- **Light public palette:** white background, deep navy text, gold accent
- **Typography:** System fonts with tight tracking on headers, generous line height on body
- **Surfaces:** Deep navy cards (`#0D1520`) with gold border at 20% opacity
- **Interactions:** Scale press feedback (0.97), haptic on primary actions

---

## Phase 2 — Database Wiring (Next)

Replace mock data with live tRPC calls to the shared Express backend.

### Priority Order

The backend already has the WID pipeline, creator profiles, and song data. Wiring is a matter of replacing `MOCK_*` imports with `trpc.*` calls.

| Task | Arm | Effort |
|---|---|---|
| Configure `EXPO_PUBLIC_API_URL` env var pointing to production API | I | Low |
| Replace `MOCK_CREATORS` on Discover screen with `trpc.profile.discover` | II | Low |
| Replace `MOCK_WORKS` on Discover screen with `trpc.songs.discover` | I | Low |
| Replace `MOCK_WITNESSES` on Witness screen with `trpc.wids.getByCreator` | I | Low |
| Wire Creator Profile screen to `trpc.profile.getByHandle` | II | Low |
| Wire Studio screen works list to `trpc.songs.getMine` | I | Low |
| Wire You screen identity card to `trpc.auth.me` | II | Low |
| Add loading states and error boundaries to all screens | I | Medium |
| Add pull-to-refresh on Discover and Witness screens | II | Low |

---

## Phase 3 — WID Registration Flow (Core Ceremony)

The most important user flow on the platform. A creator must be able to register a work from their phone.

This is the mobile expression of the First Witness Flow UX spec (`docs/first-witness-flow-ux.md`).

| Task | Arm | Notes |
|---|---|---|
| Build WID Registration modal/sheet (triggered from Witness screen) | I | 3-step: Intake → Processing → Discharge |
| Step 1 — Intake: title, medium selector, description, optional file attach | I | Low friction, no account required for preview |
| Step 2 — Processing: animated "machine" state (hashing, signing, minting) | I | Lottie or CSS animation, mechanical audio cues |
| Step 3 — Discharge: WID result card, share sheet, "Claim Your WID" CTA | I | Conversion point — prompt account creation |
| Wire to `trpc.wids.create` backend procedure | I | Already exists in backend |
| Generate and display WID certificate (PDF or shareable image) | I | Use existing PDF generation endpoint |
| Add WID to creator's Studio works list after registration | I | Optimistic update |
| Haptic feedback at each ceremony step | I | `ImpactFeedbackStyle.Medium` on sign, `NotificationFeedbackType.Success` on mint |

---

## Phase 4 — Authentication

| Task | Arm | Notes |
|---|---|---|
| Implement Manus OAuth login flow via `expo-web-browser` | II | Deep link callback already scaffolded in `app/oauth/callback.tsx` |
| Persist auth token with `expo-secure-store` | II | Never AsyncStorage for tokens |
| Gate Studio and You screens behind auth | II | Redirect to login if unauthenticated |
| Show public-only Discover and Profile without auth | II | Light theme = public, dark = authenticated |
| Add "Sign In" CTA to Discover screen header for unauthenticated users | II | Gold button, top right |

---

## Phase 5 — Community Features

| Task | Arm | Notes |
|---|---|---|
| Witness feed (real-time new WID registrations) | II | WebSocket or polling from `/api/wids/recent` |
| Follow / unfollow creators | II | Wire to `trpc.profile.follow` |
| Creator search (by name, handle, WID) | II | Search bar on Discover already scaffolded |
| Signals feed (creator activity) | II | Port from web Signals component |
| Guild membership display on Creator Profile | II | Badge row below creator stats |
| Listen Together — join a room from mobile | II | WebSocket room, shared playback state |

---

## Phase 6 — Commerce Layer

| Task | Arm | Notes |
|---|---|---|
| Fan gift / tip flow (Stripe Payment Sheet) | III | `@stripe/stripe-react-native` SDK |
| Sync license purchase from work detail screen | III | Navigate to Stripe checkout via `expo-web-browser` |
| Creator earnings summary on Studio screen | III | Wire to `trpc.stripe.getEarnings` |
| Stripe Connect onboarding from mobile | III | Open Stripe Express dashboard in browser |
| Gift-to-download flow (gift unlocks download) | III | File download via `expo-file-system` |

---

## Phase 7 — Keeper AI Agent (Mobile)

The Keeper is the Personal Nexus Agent — a creative mirror trained on the creator's corpus. On mobile it should be ambient and accessible without being intrusive.

| Task | Arm | Notes |
|---|---|---|
| Floating Keeper orb on Studio and Profile screens | IV | Persistent bottom-right presence, tap to expand |
| Keeper chat panel (slide-up sheet) | IV | Port from web FloatingAvatar component |
| Voice input via `expo-audio` microphone | IV | Push-to-talk, Whisper transcription |
| Now Playing context passed to Keeper | IV | Keeper knows what the creator is listening to |
| Keeper mode ring (Guide / Conductor / Critic / Custodian) | IV | Color-coded per LN-PHASE2-SPEC.md |
| Keeper skin slot (creator-customizable avatar) | IV | JSON skin descriptor, image layer |

---

## Phase 8 — Native Polish

| Task | Arm | Notes |
|---|---|---|
| Theme toggle wired to `ThemeProvider` (Sanctuary Mode switch) | IV | Currently local state only |
| Push notifications for new witnesses on your works | II | `expo-notifications`, server already has push endpoint |
| Offline mode — cache last-seen Discover feed | II | `@tanstack/react-query` persistence adapter |
| Deep links — `ln://wid/:widId` opens work detail | I | Already scaffolded in `app.config.ts` |
| Share sheet — share WID as image card | I | `expo-sharing` + generated WID card image |
| Haptic feedback pass — all primary actions | I | Audit every `onPress` for haptic coverage |
| Animated transitions between tabs | II | `react-native-reanimated` shared element |
| Biometric lock for Studio screen | II | `expo-local-authentication` |

---

## Phase 9 — Guide Entity (Mobile)

The Guide Entity is the manuscript/comic/book upload pipeline. Mobile must support the intake step.

| Task | Arm | Notes |
|---|---|---|
| Guide upload intake — file picker + metadata | I | `expo-document-picker`, multi-file |
| Guide detail view — read/scroll comic pages | I | `expo-image` with page-by-page navigation |
| Cinematic reader mode — full-screen immersive | I | Port from web CinematicComicReader |
| Guide WID display and share | I | Same WID badge component, guide variant |

---

## Phase 10 — App Store Submission

| Task | Notes |
|---|---|
| Generate production APK / IPA via Expo EAS Build | Use Publish button in Manus UI |
| App Store Connect submission (iOS) | Requires Apple Developer account |
| Google Play Console submission (Android) | Requires Google Play account |
| App Store screenshots (6.5" iPhone, 12.9" iPad) | 5 screens minimum |
| Privacy policy URL | Required for both stores |
| App Store description copy | Doctrine-aligned, creator-focused |

---

## Deferred / Under Consideration

These items are documented but not yet scheduled into a phase.

| Feature | Notes |
|---|---|
| Prompt Origin Protocol (POP) mobile intake | Register AI prompts as WIDs from mobile |
| Satchel — creator event ledger view | Port from web CreatorSurface Satchel tab |
| Provenance Prompt Generator (PPG) | AI-assisted WID description generation |
| AR WID verification — scan a physical work | Camera + WID lookup overlay |
| Apple Watch companion — WID notifications | watchOS extension |
| iPad layout — split-pane Studio | Larger canvas for creators on iPad |

---

## Database Dependency Map

When wiring Phase 2, these are the backend procedures that map to each screen:

| Screen | tRPC Procedures Needed |
|---|---|
| Discover | `songs.discover`, `profile.discover`, `wids.getRecent` |
| Creator Profile | `profile.getByHandle`, `songs.getByCreator`, `wids.getByCreator` |
| Witness | `wids.getRecent`, `wids.create` |
| Studio | `songs.getMine`, `wids.getByCreator`, `stripe.getEarnings` |
| You | `auth.me`, `profile.getMe`, `auth.logout` |

---

*Command Domains LLC — Montgomery, TX*
*In honor of PFC Miller.*
*Colossians 1:17*
