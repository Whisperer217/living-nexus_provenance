# Living Nexus — Phase 2 Feature Specification

**Version:** 0.2  
**Status:** Design  
**Scope:** Floating Avatar Widget · Cinematic Mode · Now Playing Context · Global Player · Keeper PWA

---

## 1. Overview

Phase 1 delivered the provenance pipeline: Ed25519 identity, append-only event ledger, anchor flow, WID registry, and the 4-panel creator surface. Phase 2 transforms the platform from a solo creation tool into a **living creative presence** — an ambient, context-aware environment where the creator's avatar acts as a sovereign agent, the editor responds to the music being made, and the platform holds a shared listening commons with full attribution.

The three pillars of Phase 2 are:

1. **The Floating Avatar Widget** — a persistent, skinnable creative presence on every surface
2. **Cinematic Mode** — a distraction-free writing environment that responds to musical context
3. **The Global Player** — a provenance-aware shared listening layer across all creators on the platform

These three features converge on a single idea: **the platform knows what you are making, what you are listening to, and who made what you are hearing — and your avatar is the interface between all three.**

---

## 2. Floating Avatar Widget

### 2.1 Concept

The avatar widget is a persistent floating element that lives above the creator surface at all times. It is the visual and interactive representation of the creator's Personal Nexus Avatar (PNA) — the AI agent trained exclusively on their corpus. It is not a generic assistant. It is a creative mirror.

The widget has two states: **collapsed** (an orb) and **expanded** (a chat/context panel). In its collapsed state it is ambient — a pulse, a color, a presence. In its expanded state it is the full agent interface.

### 2.2 Visual Structure

```
╔══════════════════════════════╗
║  [Avatar Orb — 64px circle]  ║  ← collapsed state
║  ┌──────────────────────┐    ║
║  │ Mode ring (color)    │    ║
║  │ Skin layer (image)   │    ║  ← skin slot
║  │ Pulse animation      │    ║
║  └──────────────────────┘    ║
╚══════════════════════════════╝

╔══════════════════════════════════════╗
║  [Expanded — 320px wide panel]       ║  ← expanded state
║  ┌────────────────────────────────┐  ║
║  │ Avatar orb (32px) + mode label │  ║
║  │ Now Playing context (if any)   │  ║
║  │ ─────────────────────────────  │  ║
║  │ Message thread                 │  ║
║  │ Mode selector tabs             │  ║
║  │ Input field                    │  ║
║  └────────────────────────────────┘  ║
╚══════════════════════════════════════╝
```

### 2.3 Avatar Orb States

| State | Visual | Trigger |
|---|---|---|
| Idle | Slow gold pulse | No activity |
| Listening | Soft blue shimmer | Now Playing detected |
| Thinking | Rapid amber flicker | Agent generating response |
| Anchoring | Green ring sweep | Provenance event being signed |
| Cinematic | Dim white glow | Cinematic mode active |
| Error | Red pulse | Signature failure or network error |

### 2.4 Mode Color Ring

The outer ring of the orb reflects the active agent mode:

| Mode | Ring Color | Role |
|---|---|---|
| Guide | `#C9A84C` (gold) | Supportive, generative, encouraging |
| Conductor | `#7B9EA6` (steel blue) | Structural, arrangement-focused |
| Critic | `#A65C5C` (muted red) | Honest, editorial, challenging |
| Custodian | `#6A8C6A` (forest green) | Archival, provenance-aware, protective |

### 2.5 Skin Slot Architecture

The skin slot is a defined layer in the widget component that accepts a skin asset. A skin is a JSON descriptor stored in the user's profile:

```ts
type AvatarSkin = {
  skinId: string;
  name: string;
  assetUrl: string;          // uploaded to S3, served via CDN
  assetType: "image" | "spritesheet" | "lottie";
  frameCount?: number;       // for spritesheets
  idleFrames?: [number, number];
  activeFrames?: [number, number];
  price?: number;            // in platform credits
  creatorId?: string;        // if a creator-made skin
};
```

The default skin is the creator's initials rendered in EB Garamond on an obsidian background with a gold border. All other skins are purchasable. The skin slot is built in Phase 2; the marketplace is Phase 3.

### 2.6 Positioning and Interaction

- Default position: bottom-right, 24px from edges
- Draggable: user can reposition, position persists in localStorage
- Keyboard shortcut: `Cmd/Ctrl + Shift + A` toggles expanded/collapsed
- On mobile: fixed bottom-center, full-width expansion upward
- Z-index: always above editor, below modals

---

## 3. Cinematic Mode

### 3.1 Concept

Cinematic mode is a full-focus writing environment. When activated, the platform recedes and the word takes precedence. The avatar does not disappear — it becomes ambient. The provenance infrastructure continues running silently in the background.

### 3.2 Visual Transformation

When cinematic mode activates, the following transitions occur over 400ms:

| Element | Normal state | Cinematic state |
|---|---|---|
| Satchel panel | Visible, 280px | Slides out, hidden |
| Agent panel | Visible, 320px | Hidden (avatar orb only) |
| Editor | Center column | Full viewport width |
| Background | `#0f0e0b` (obsidian) | `#080807` (deeper black) |
| Editor font size | 16px | 20px |
| Line height | 1.6 | 1.9 |
| Provenance bar | Full bar, visible | Gold hairline, 2px, opacity 0.3 |
| Now Playing strip | N/A | Faint text, top of editor, opacity 0.4 |
| Avatar orb | Full size, bottom-right | 32px, bottom-right, opacity 0.6 |
| Cursor | Default | Thin gold line cursor |

### 3.3 Activation

- Button in the top toolbar: `[ ⬛ Cinematic ]`
- Keyboard shortcut: `Cmd/Ctrl + Shift + C`
- Auto-activates if user has not interacted with Satchel or Agent panel for 10 minutes (opt-in setting)
- Deactivates on: Escape key, clicking the button again, or clicking the avatar orb

### 3.4 Now Playing Strip in Cinematic Mode

When a track is detected (see Section 4), a faint strip appears at the top of the editor:

```
♪  Kendrick Lamar — "euphoria"  ·  WID: a3f9...  ·  Creator: @kendrick.ln
```

This strip is non-interactive in cinematic mode. It is purely ambient context — a reminder of what is in the air while you write. Tapping it (mobile) or hovering (desktop) reveals the full provenance card.

---

## 4. Now Playing Context

### 4.1 Detection Layers

The avatar's awareness of what is playing operates across three layers, in priority order:

**Layer 1 — LN Global Player (highest priority)**  
When the LN global player is active and a track is playing, the platform has full provenance context: WID, creator ID, lyric payload, fork history. This is the richest context layer. The avatar can surface connections between the playing track and the user's own satchel.

**Layer 2 — Browser Media Session API**  
When an external tab (Spotify Web, YouTube, Apple Music Web) is playing, the browser exposes `navigator.mediaSession.metadata` — track title, artist, album, artwork. No API key required. The avatar reads this passively and surfaces it as context without full provenance data.

**Layer 3 — Manual "Now Playing" Input**  
The user can type or paste a track name into the avatar widget. The avatar acknowledges it and uses it as creative context for the session. No detection required.

### 4.2 Context Object

Regardless of source, all three layers normalize to the same context object:

```ts
type NowPlayingContext = {
  source: "ln_player" | "media_session" | "manual";
  trackTitle: string;
  artistName: string;
  artworkUrl?: string;
  wid?: string;              // only from LN player
  creatorId?: string;        // only from LN player
  lyricPayload?: string;     // only from LN player, if anchored
  forkHistory?: string[];    // only from LN player
  detectedAt: number;        // UTC timestamp
};
```

### 4.3 Avatar Behavior on Track Detection

When a track is detected, the avatar:

1. Shifts to the "Listening" state (soft blue shimmer)
2. Adds a system message to the agent thread:

> *"Now playing: [Track Title] — [Artist]. [If LN source: This track was anchored by @creator on [date]. WID: `xxxx`. It forks from [n] events in the ledger.] Want me to pull the lyrical structure for reference, or keep this as ambient context?"*

3. Waits for user response — does not automatically analyze unless asked
4. If the user is in cinematic mode, the message is queued and delivered as a subtle notification, not an interruption

### 4.4 Provenance-Aware Listening (LN Player only)

When a track from the LN Global Player is detected, the avatar performs a background check against the user's satchel:

- Does the playing track share a parent event with anything in the user's satchel?
- Has the playing creator ever forked from the user's work?
- Is there a WID collision (same content hash, different creator)?

If any of these are true, the avatar surfaces a connection prompt. This is the feature that makes LN fundamentally different from any other platform — the music you hear is not just music, it is a node in a graph you are also part of.

---

## 5. LN Global Player

### 5.1 Concept

The Global Player is a persistent audio layer at the bottom of the platform — visible on all pages, not just the creator surface. It plays tracks that have been anchored to the LN ledger by any creator. Every track in the player has a WID, a creator, and a provenance record.

The Global Player is the social layer of Living Nexus. It is where the platform becomes a commons rather than a collection of isolated workspaces.

### 5.2 Data Model

```ts
// New table: tracks
tracks {
  trackId: string (PK)        // SHA-256 of audio content hash
  eventId: string (FK → events)  // the anchor event
  creatorId: string (FK → users)
  wid: string (FK → wids)
  title: string
  audioUrl: string            // S3 URL
  durationSeconds: number
  isPublic: boolean
  playCount: number
  createdAt: number
}

// New table: track_plays (append-only)
track_plays {
  playId: string (PK)
  trackId: string (FK → tracks)
  listenerId: string (FK → users)
  startedAt: number
  completedAt?: number
}
```

### 5.3 Player UI

```
╔══════════════════════════════════════════════════════════════════╗
║  [Avatar 32px]  Track Title — Artist Name          ♪ ──●──── ♪  ║
║                 WID: a3f9...  ·  @creator.ln        ◀ ▶  ♡  ↗   ║
╚══════════════════════════════════════════════════════════════════╝
```

- Persistent bottom bar, 64px height
- Shows: creator avatar, track title, artist, WID (truncated), playback controls
- WID is clickable — opens the full provenance card
- Creator avatar is clickable — opens creator profile
- Heart icon: adds to personal satchel as a reference event
- Share icon: copies WID link

### 5.4 Queue Logic

The Global Player queue is curated by three modes (user-selectable):

| Queue Mode | Logic |
|---|---|
| **Discovery** | Tracks from creators the user has not heard before, weighted by provenance depth |
| **Lineage** | Tracks that share provenance lineage with the user's own anchored events |
| **Trending** | Most-played tracks in the last 24 hours across the platform |

### 5.5 Avatar Integration

When the Global Player is active, the user's avatar widget receives the full `NowPlayingContext` object with all provenance fields populated. This is the richest version of the "now playing" feature — the avatar knows not just what is playing but its entire creative genealogy.

---

## 6. Keeper PWA

### 6.1 Concept

The Keeper is a separate Progressive Web App — installable on any device — that acts as the creator's local sovereign agent. It is the ambient, always-on complement to the LN creator surface. Where the creator surface is for deep work, the Keeper is for capture, sync, and presence.

The Keeper holds the creator's private key in the device's secure storage (Web Crypto API, non-exportable option available). It queues provenance packets when offline and syncs to the Nexus when connection is restored.

### 6.2 Core Functions

| Function | Description |
|---|---|
| **Quick Capture** | One-tap text or voice capture, auto-classified by mode |
| **Offline Queue** | Service worker queues signed packets when offline |
| **Background Sync** | Pushes queued packets to LN on reconnect |
| **Corpus Ingestion** | Drag-in documents, past lyrics, book chapters |
| **Now Playing** | Reads Media Session API, surfaces to avatar |
| **Push Notifications** | WID confirmations, lineage alerts, collab requests |
| **Key Management** | Holds private key in IndexedDB (encrypted), never transmits |

### 6.3 Provenance Packet Format

Every item captured by the Keeper is wrapped in a provenance packet before leaving the device:

```ts
type ProvenancePacket = {
  eventId: string;           // SHA-256(chainInput)
  creatorId: string;         // user ID
  contentHash: string;       // SHA-256(canonicalized payload)
  payloadCanonical: string;  // normalized text
  signature: string;         // Ed25519 sig of eventId
  parentEventId: string | null;
  captureMode: "text" | "voice_transcript" | "corpus_import" | "image_prompt";
  sessionLabel: string;
  capturedAt: number;        // UTC timestamp, local device time
  syncedAt?: number;         // set when Nexus confirms receipt
  wid?: string;              // set when Nexus issues WID
};
```

### 6.4 Ingest Endpoint (LN Backend)

A new endpoint on the LN backend receives packets from the Keeper:

```
POST /api/events/ingest
Authorization: Bearer <session token>
Content-Type: application/json

Body: ProvenancePacket | ProvenancePacket[]
```

The endpoint:
1. Verifies the signature against the creator's stored public key
2. Verifies the content hash matches the payload
3. Appends the event to the ledger
4. Issues a WID
5. Returns `{ eventId, wid, confirmedAt }`

Batch ingestion (array of packets) is supported for offline queue flush.

### 6.5 PWA Technical Stack

- **Framework:** React + Vite (same stack as LN, shared types via npm package)
- **Storage:** IndexedDB via `idb` library (corpus, queue, key material)
- **Service Worker:** Workbox (offline cache, background sync)
- **Key Storage:** Web Crypto API — `subtle.generateKey` with `extractable: false` for maximum security, or `extractable: true` with AES-GCM encryption for backup capability
- **Auth:** Shared Manus OAuth session — same identity as LN, no separate login
- **Manifest:** Installable, standalone display mode, custom icon per creator skin

---

## 7. Build Sequence

### Phase 2a — Tonight

| Feature | Effort | Notes |
|---|---|---|
| Floating avatar widget (orb + expand) | Medium | Replaces right-side agent panel |
| Mode color ring + pulse animations | Low | CSS only |
| Skin slot (default initials skin) | Low | Architecture ready for future skins |
| Cinematic mode toggle + transitions | Medium | CSS transitions + state flag |
| Now Playing — Media Session API hook | Low | `navigator.mediaSession` read |
| Now Playing — Manual input in widget | Low | Text field in expanded widget |
| Avatar reacts to now playing | Low | System message in agent thread |
| Now Playing strip in cinematic mode | Low | Faint text overlay |

### Phase 2b — Next Session

| Feature | Effort | Notes |
|---|---|---|
| LN Global Player (basic) | High | New DB table, audio player UI |
| Track upload + anchor flow | Medium | S3 upload + existing anchor pipeline |
| Avatar ↔ Global Player integration | Low | Wire NowPlayingContext from player |
| Provenance lineage check on play | Medium | Graph query against event chain |

### Phase 2c — Keeper PWA

| Feature | Effort | Notes |
|---|---|---|
| PWA scaffold (Vite + manifest + SW) | Medium | New project, shared types |
| Quick capture (text + voice) | Medium | Voice uses existing transcription API |
| Offline queue + background sync | High | Service worker + IndexedDB |
| `/api/events/ingest` endpoint on LN | Low | New tRPC procedure |
| Key management in IndexedDB | High | Web Crypto API, careful security review |
| Corpus ingestion (file drag-in) | Medium | File reader + canonicalize + queue |

### Phase 3 — Avatar Economy

| Feature | Effort | Notes |
|---|---|---|
| Skin marketplace | High | Stripe integration, S3 assets |
| Creator-made skins | High | Upload flow, review, publish |
| Avatar visible in Global Player | Medium | Public avatar display on track play |
| PNA style fingerprint training | High | Corpus → fine-tune pipeline |

---

## 8. Open Questions

1. **Key backup UX:** Should the Keeper offer an encrypted export of the private key (user holds the password), or should the private key be device-bound and non-exportable? The non-exportable option is more secure but means losing the device loses the signing identity. Recommend: exportable with strong AES-GCM encryption, user-chosen passphrase, explicit warning.

2. **Global Player moderation:** Who decides what gets into the Discovery queue? Recommend: creator must have at least one anchored event with a valid WID. No editorial curation — provenance is the filter.

3. **Skin ownership:** Are skins NFTs or platform-native assets? Recommend: platform-native to start (simpler, no gas fees, no wallet friction). NFT bridge is a Phase 4 option if the community demands it.

4. **PNA training data:** What corpus does the PNA train on? Recommend: only events the creator has explicitly anchored (sealed with a WID). Checkpoint events are excluded from training — only anchored events count. This preserves the distinction between drafts and finished work.

5. **Avatar visibility to others:** When your track plays in someone else's Global Player, does your avatar appear in their widget? Recommend: yes, as a small secondary orb — "playing from @creator.ln" — with a link to their profile. This is the social presence layer.

---

*Document maintained in `/LN-PHASE2-SPEC.md` — update as decisions are made.*
